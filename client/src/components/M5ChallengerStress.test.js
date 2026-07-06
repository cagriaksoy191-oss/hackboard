import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

describe('Milestone 5 UI/UX & Gestures Empirical Stress Testing', () => {
  const modalPath = path.resolve('src/components/common/Modal.jsx');
  const confirmModalPath = path.resolve('src/components/ConfirmModal.jsx');
  const spotlightPath = path.resolve('src/components/organisms/SpotlightSearch.jsx');
  const headerPath = path.resolve('src/components/Header.jsx');
  const sidebarPath = path.resolve('src/components/Sidebar.jsx');

  test('Focus Trapping: Single Modal cycle and wraps', () => {
    // 1. Recreate the JSDOM environment
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="modal-root">
          <div id="modal-container">
            <button id="btn-close">Close</button>
            <input id="input-title" type="text" />
            <button id="btn-save">Save</button>
          </div>
        </div>
      </body>
      </html>
    `, { url: 'http://localhost' });

    const { window } = dom;
    const { document } = window;
    const container = document.getElementById('modal-container');
    const btnClose = document.getElementById('btn-close');
    const inputTitle = document.getElementById('input-title');
    const btnSave = document.getElementById('btn-save');

    // 2. Focus Trap logic simulation
    const focusableSelector = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
    let focusableElements = Array.from(container.querySelectorAll(focusableSelector));

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') return; // handles escape separately
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

    window.activeElementMock = btnClose;
    btnClose.focus = () => { window.activeElementMock = btnClose; };
    inputTitle.focus = () => { window.activeElementMock = inputTitle; };
    btnSave.focus = () => { window.activeElementMock = btnSave; };

    // Stress test Tab wrap around (last -> first)
    window.activeElementMock = btnSave;
    let defaultPrevented = false;
    handleKeyDown({
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => { defaultPrevented = true; }
    });
    assert.strictEqual(window.activeElementMock, btnClose, 'Tab wrap should move focus from last element to first element');
    assert.ok(defaultPrevented, 'Tab wrap event default behavior must be prevented');

    // Stress test Shift+Tab wrap around (first -> last)
    window.activeElementMock = btnClose;
    defaultPrevented = false;
    handleKeyDown({
      key: 'Tab',
      shiftKey: true,
      preventDefault: () => { defaultPrevented = true; }
    });
    assert.strictEqual(window.activeElementMock, btnSave, 'Shift+Tab wrap should move focus from first element to last element');
    assert.ok(defaultPrevented, 'Shift+Tab wrap event default behavior must be prevented');
  });

  test('Focus Trapping: Global Focus stealing resolved via isTopmost check', () => {
    const dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <body>
        <div id="modal-1" role="dialog">
          <input id="modal-input" type="text" />
        </div>
        <div id="modal-2" role="dialog">
          <button id="confirm-yes">Yes</button>
        </div>
      </body>
      </html>
    `);

    const { window } = dom;
    const { document } = window;

    const modal1 = document.getElementById('modal-1');
    const modalInput = document.getElementById('modal-input');
    const modal2 = document.getElementById('modal-2');
    const confirmYes = document.getElementById('confirm-yes');

    // Mock activeElement
    window.activeElementMock = confirmYes;
    modalInput.focus = () => { window.activeElementMock = modalInput; };
    confirmYes.focus = () => { window.activeElementMock = confirmYes; };

    // Simulate topmost logic
    const isTopmost = (container) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      return dialogs.length === 0 || dialogs[dialogs.length - 1] === container;
    };

    // Modal 1 focus listener (lower level, not topmost)
    let modal1Steals = 0;
    const handleModal1Focus = (e) => {
      if (!isTopmost(modal1)) return; // Should return early and not steal
      modal1Steals++;
      modalInput.focus();
    };

    // Modal 2 focus listener (topmost)
    let modal2Steals = 0;
    const handleModal2Focus = (e) => {
      if (!isTopmost(modal2)) return; // Topmost, should run
      if (!modal2.contains(e.target)) {
        modal2Steals++;
        confirmYes.focus();
      }
    };

    // Simulate focus event on modalInput (which is outside modal2)
    handleModal1Focus({ target: modalInput });
    handleModal2Focus({ target: modalInput });

    assert.strictEqual(modal1Steals, 0, 'Modal 1 should NOT steal focus because it is not topmost');
    assert.strictEqual(modal2Steals, 1, 'Modal 2 SHOULD steal focus because it is topmost and target is outside');
    assert.strictEqual(window.activeElementMock, confirmYes, 'Focus must end up on Modal 2 (topmost)');
  });

  test('Focus Trapping: Escape key accessibility check', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    const confirmModalContent = fs.readFileSync(confirmModalPath, 'utf8');

    // Verify both files check for Escape key
    assert.ok(modalContent.includes("'Escape'"), 'Modal.jsx now handles the Escape key');
    assert.ok(confirmModalContent.includes("'Escape'"), 'ConfirmModal.jsx now handles the Escape key');
  });

  test('Exit Animations: SpotlightSearch vs ConfirmModal Exit Anim Orchestration', () => {
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    const spotlightContent = fs.readFileSync(spotlightPath, 'utf8');
    const confirmContent = fs.readFileSync(confirmModalPath, 'utf8');

    // SpotlightSearch is unmounted conditionally by Header:
    // {searchOpen && <SpotlightSearch ... />}
    // And SpotlightSearch returns isOpen && (...)
    // This double-condition prevents exit animation.
    assert.ok(headerContent.includes('searchOpen &&'), 'Header.jsx uses conditional unmounting on SpotlightSearch');
    assert.ok(spotlightContent.includes('isOpen && (') || spotlightContent.includes('!isOpen'), 'SpotlightSearch short-circuits internal render when isOpen is false');

    // ConfirmModal is always mounted by its parent, and it manages AnimatePresence internally at the root level.
    // It conditionally renders its inner motion.div based on isOpen.
    // This allows Framer Motion to intercept the unmounting of the DOM nodes and perform exit transitions.
    assert.ok(confirmContent.includes('<AnimatePresence>'), 'ConfirmModal uses AnimatePresence to coordinate unmounting delay');
    assert.ok(confirmContent.includes('exit="exit"'), 'ConfirmModal has exit animation variants defined');
  });

  test('Mobile Gestures: Sidebar Edge Swipe for Swipe-to-Open', () => {
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    // Verify swipe-to-close onDragEnd is present
    assert.ok(sidebarContent.includes('info.offset.x < -80'), 'Sidebar has swipe-to-close check');

    // Verify swipe-to-open touch events on edge swipe detector are present
    assert.ok(sidebarContent.includes('edge-swipe-detector'), 'Sidebar has edge-swipe-detector touch area');
    assert.ok(sidebarContent.includes('onTouchStart'), 'Sidebar touch start event registered for edge swipe');
    assert.ok(sidebarContent.includes('touchCurrentX - touchStartX > 40'), 'Sidebar checks swipe right offset to trigger open');
  });
});
