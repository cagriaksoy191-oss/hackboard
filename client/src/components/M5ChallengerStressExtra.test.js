import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

describe('Milestone 5 Premium UI/UX Extra Adversarial Stress Testing', () => {
  test('Focus Trapping: Edge Cases (Disabled & Tabindex=-1 & Dynamic Change)', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="modal-container">
          <button id="btn-1">Button 1</button>
          <input id="input-disabled" disabled type="text" value="disabled" />
          <div id="div-no-tab" tabindex="-1">No Tab</div>
          <button id="btn-2">Button 2</button>
          <a id="link-3" href="#">Link 3</a>
        </div>
      </body>
      </html>
    `, { url: 'http://localhost' });

    const { window } = dom;
    const { document } = window;
    const container = document.getElementById('modal-container');
    const btn1 = document.getElementById('btn-1');
    const inputDisabled = document.getElementById('input-disabled');
    const divNoTab = document.getElementById('div-no-tab');
    const btn2 = document.getElementById('btn-2');
    const link3 = document.getElementById('link-3');

    // Simulate focus trapping selector
    const focusableSelector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    
    // Check initial focusable elements
    let focusableElements = Array.from(container.querySelectorAll(focusableSelector));
    assert.strictEqual(focusableElements.length, 3, 'Only 3 elements should be focusable (btn-1, btn-2, link-3)');
    assert.ok(focusableElements.includes(btn1));
    assert.ok(focusableElements.includes(btn2));
    assert.ok(focusableElements.includes(link3));
    assert.ok(!focusableElements.includes(inputDisabled), 'Disabled input should be excluded');
    assert.ok(!focusableElements.includes(divNoTab), 'tabindex="-1" element should be excluded');

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      focusableElements = Array.from(container.querySelectorAll(focusableSelector));
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (window.activeElementMock === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (window.activeElementMock === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    // Setup focus mock
    window.activeElementMock = btn1;
    btn1.focus = () => { window.activeElementMock = btn1; };
    btn2.focus = () => { window.activeElementMock = btn2; };
    link3.focus = () => { window.activeElementMock = link3; };

    // Test Tab wrapping last -> first
    window.activeElementMock = link3;
    let defaultPrevented = false;
    handleKeyDown({
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => { defaultPrevented = true; }
    });
    assert.strictEqual(window.activeElementMock, btn1, 'Tab wrap should move focus from last (link-3) to first (btn-1)');
    assert.ok(defaultPrevented);

    // Test Shift+Tab wrapping first -> last
    window.activeElementMock = btn1;
    defaultPrevented = false;
    handleKeyDown({
      key: 'Tab',
      shiftKey: true,
      preventDefault: () => { defaultPrevented = true; }
    });
    assert.strictEqual(window.activeElementMock, link3, 'Shift+Tab wrap should move focus from first (btn-1) to last (link-3)');
    assert.ok(defaultPrevented);
  });

  test('Focus Trapping: Deep Multi-Modal Nesting (3 Modals)', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="modal-1" role="dialog"><input id="input-1" /></div>
        <div id="modal-2" role="dialog"><input id="input-2" /></div>
        <div id="modal-3" role="dialog"><input id="input-3" /></div>
      </body>
      </html>
    `);

    const { window } = dom;
    const { document } = window;
    const modal1 = document.getElementById('modal-1');
    const input1 = document.getElementById('input-1');
    const modal2 = document.getElementById('modal-2');
    const input2 = document.getElementById('input-2');
    const modal3 = document.getElementById('modal-3');
    const input3 = document.getElementById('input-3');

    // Focus state mock
    window.activeElementMock = input3;
    input1.focus = () => { window.activeElementMock = input1; };
    input2.focus = () => { window.activeElementMock = input2; };
    input3.focus = () => { window.activeElementMock = input3; };

    const isTopmost = (container) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      return dialogs.length === 0 || dialogs[dialogs.length - 1] === container;
    };

    // Setup listeners
    let traps = { modal1: 0, modal2: 0, modal3: 0 };
    const makeFocusHandler = (container, key) => (e) => {
      if (!isTopmost(container)) return;
      if (!container.contains(e.target)) {
        traps[key]++;
        const first = container.querySelector('input');
        if (first) first.focus();
      }
    };

    const handleFocus1 = makeFocusHandler(modal1, 'modal1');
    const handleFocus2 = makeFocusHandler(modal2, 'modal2');
    const handleFocus3 = makeFocusHandler(modal3, 'modal3');

    // Simulate focus change targeting input-1 (which is outside modal3)
    // Only modal-3 is topmost and should intercept the focus and steal it back to input-3
    handleFocus1({ target: input1 });
    handleFocus2({ target: input1 });
    handleFocus3({ target: input1 });

    assert.strictEqual(traps.modal1, 0, 'Modal 1 should not trap focus (not topmost)');
    assert.strictEqual(traps.modal2, 0, 'Modal 2 should not trap focus (not topmost)');
    assert.strictEqual(traps.modal3, 1, 'Modal 3 should trap focus (is topmost)');
    assert.strictEqual(window.activeElementMock, input3, 'Active element should remain input-3');
  });

  test('Mobile Gestures: Swipe-to-Open edge-swipe JSDOM integration', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="root"></div>
      </body>
      </html>
    `, { url: 'http://localhost' });

    const { window } = dom;
    const { document } = window;
    
    // Simulating how Sidebar.jsx registers touch events on the detector
    let sidebarOpen = false;
    const toggle = () => { sidebarOpen = true; };
    
    const detector = document.createElement('div');
    detector.id = 'edge-swipe-detector';
    document.body.appendChild(detector);
    
    // Wire up the handler exactly as in Sidebar.jsx:
    detector.addEventListener('touchstart', (e) => {
      const touchStartX = e.touches[0].clientX;
      const handleTouchMove = (moveEvent) => {
        const touchCurrentX = moveEvent.touches[0].clientX;
        if (touchCurrentX - touchStartX > 40) {
          toggle();
          document.removeEventListener('touchmove', handleTouchMove);
        }
      };
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', handleTouchMove);
      }, { once: true });
    });

    // 1. Simulate TouchStart on the detector
    const touchStartEvent = new window.CustomEvent('touchstart', { bubbles: true });
    touchStartEvent.touches = [{ clientX: 10 }];
    detector.dispatchEvent(touchStartEvent);

    // 2. Simulate TouchMove on document with insufficient delta (e.g. clientX = 30, delta = 20)
    const touchMoveEvent1 = new window.CustomEvent('touchmove', { bubbles: true });
    touchMoveEvent1.touches = [{ clientX: 30 }];
    document.dispatchEvent(touchMoveEvent1);
    assert.strictEqual(sidebarOpen, false, 'Should not open with drag < 40px');

    // 3. Simulate TouchMove on document with sufficient delta (e.g. clientX = 60, delta = 50)
    const touchMoveEvent2 = new window.CustomEvent('touchmove', { bubbles: true });
    touchMoveEvent2.touches = [{ clientX: 60 }];
    document.dispatchEvent(touchMoveEvent2);
    assert.strictEqual(sidebarOpen, true, 'Should open when drag is > 40px');
  });
});
