import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Milestone 5 UI/UX & Gestures Static Code Verification', () => {
  const modalPath = path.resolve('src/components/common/Modal.jsx');
  const confirmModalPath = path.resolve('src/components/ConfirmModal.jsx');
  const sidebarPath = path.resolve('src/components/Sidebar.jsx');

  test('Modal.jsx keydown listener handles Escape key closing', () => {
    const content = fs.readFileSync(modalPath, 'utf8');
    
    // Check that it registers keydown and checks for 'Escape'
    assert.ok(content.includes('keydown'), 'Modal.jsx should have keydown event listener');
    assert.ok(content.includes('Escape'), 'Modal.jsx should handle the Escape key');
  });

  test('ConfirmModal.jsx keydown listener handles Escape key closing', () => {
    const content = fs.readFileSync(confirmModalPath, 'utf8');
    
    assert.ok(content.includes('keydown'), 'ConfirmModal.jsx should have keydown event listener');
    assert.ok(content.includes('Escape'), 'ConfirmModal.jsx should handle the Escape key');
  });

  test('Modal.jsx and ConfirmModal.jsx contain global focus traps that do not conflict', () => {
    const modalContent = fs.readFileSync(modalPath, 'utf8');
    const confirmContent = fs.readFileSync(confirmModalPath, 'utf8');

    // Both register focus event listener globally on document
    assert.ok(modalContent.includes("document.addEventListener('focus'"), 'Modal.jsx registers global document focus listener');
    assert.ok(confirmContent.includes("document.addEventListener('focus'"), 'ConfirmModal.jsx registers global document focus listener');

    // Both check container.contains(e.target) to steal focus back
    assert.ok(modalContent.includes("!container.contains(e.target)"), 'Modal.jsx steals focus if target is outside container');
    assert.ok(confirmContent.includes("!container.contains(e.target)"), 'ConfirmModal.jsx steals focus if target is outside container');

    // Both check topmost/dialogs condition
    assert.ok(modalContent.includes('isTopmost'), 'Modal.jsx checks isTopmost to avoid conflicts');
    assert.ok(confirmContent.includes('isTopmost'), 'ConfirmModal.jsx checks isTopmost to avoid conflicts');
  });

  test('Sidebar.jsx supports swipe-to-open gesture', () => {
    const content = fs.readFileSync(sidebarPath, 'utf8');

    // Verify it uses framer motion drag on X axis
    assert.ok(content.includes('drag={isDesktop ? false : "x"}'), 'Sidebar should support drag on X axis for mobile');
    
    // Verify it only closes on drag end when offset is negative (swipe left to close)
    assert.ok(content.includes('info.offset.x < -80'), 'Sidebar should check for drag offset less than -80');
    
    // Verify there is swipe-to-open gesture trigger or drag zone
    assert.ok(content.includes('swipe-to-open') || content.includes('edge-swipe'), 'Sidebar has implementation for swipe-to-open from the edge');
  });
});
