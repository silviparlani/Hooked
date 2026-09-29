import { expect, test } from '@playwright/test';
for (const status of ['planned', 'active', 'completed', 'stash']) {
  test(`${status}: index, one page, animation and overflow`, async ({ page }) => {
    await page.goto('/?status=' + status);
    await expect(
      page.getByRole('heading', { name: status === 'active' ? 'Work Index' : 'Index' }),
    ).toBeVisible();
    await page.locator('.journal-index button').first().click();
    await expect(page.locator('.journal-paper')).toHaveCount(1);
    await expect(page.locator('.journal-title, .stash-label h2').first()).toBeVisible();
    expect(
      await page
        .locator('.journal-paper')
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page
        .locator('.journal-paper')
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/v2-${status}-${test.info().project.name}.png`,
      fullPage: true,
    });
    if (status === 'active') {
      await expect(page.getByRole('link', { name: 'Open work sections ↗' })).toHaveAttribute(
        'href',
        '/projects/one',
      );
      await expect(page.locator('.journal-update time')).toBeAttached();
    }
    await page.getByRole('button', { name: 'Index', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: status === 'active' ? 'Work Index' : 'Index' }),
    ).toBeVisible();
  });
}
test('long notes grow to fit without horizontal overflow', async ({ page }) => {
  await page.goto('/?status=editor');
  const note = page.getByLabel('Latest update');
  expect(await note.evaluate((element) => element.scrollHeight <= element.clientHeight + 2)).toBe(
    true,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
test('reduced motion disables page animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?status=planned');
  expect(
    await page
      .locator('.journal-paper')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});
test('touch swipe turns a page without changing order', async ({ page }) => {
  await page.goto('/?status=active');
  await page.locator('.journal-index button').first().click();
  const paper = page.locator('.journal-paper');
  await paper.evaluate((element) => {
    element.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 320,
        clientY: 300,
      }),
    );
    element.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        isPrimary: true,
        pointerId: 1,
        clientX: 100,
        clientY: 300,
      }),
    );
  });
  await expect(page.getByRole('heading', { name: 'Sunday market tote' })).toBeVisible();
});

test('photo swipes stay inside the gallery', async ({ page }) => {
  await page.goto('/?status=completed');
  await page.locator('.journal-index button').first().click();
  await expect(page.locator('.journal-cover')).toBeVisible();
  const gallery = page.locator('.journal-photo-strip');
  await expect(gallery.locator('img')).toHaveCount(2);
  await gallery.evaluate((element) => {
    element.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: [new Touch({ identifier: 1, target: element, clientX: 320, clientY: 300 })],
      }),
    );
    element.dispatchEvent(
      new TouchEvent('touchend', {
        bubbles: true,
        changedTouches: [new Touch({ identifier: 1, target: element, clientX: 100, clientY: 300 })],
      }),
    );
    element.scrollLeft = 150;
  });
  await expect(page.getByRole('heading', { name: 'Meadow cardigan' })).toBeAttached();
  expect(await gallery.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test('WIP index paginates without scrolling and has only the in-book New WIP action', async ({
  page,
}) => {
  await page.goto('/?status=active&many=1');
  await expect(page.getByRole('heading', { name: 'Work Index' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'New WIP' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next page' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Previous page' })).toHaveCount(0);
  await expect(page.locator('.journal-flourish')).toHaveCount(0);
  await expect(page.getByText(/A little book/)).toHaveCount(0);
  const paper = page.locator('.journal-paper');
  await expect.poll(() => paper.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
  const first = await page.locator('.journal-index strong').first().textContent();
  await paper.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.book-navigation output')).toContainText('Index 2 /');
  expect(await page.locator('.journal-index strong').first().textContent()).not.toBe(first);
  await expect.poll(() => paper.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.journal-index strong').first()).toHaveText(first!);
  await page.screenshot({
    path: 'test-results/wip-spiral-' + test.info().project.name + '.png',
    fullPage: true,
  });
  // A drag beginning on an index row must turn pages rather than open that project.
  const bounds = await page.locator('.journal-index button').first().boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width - 12, bounds!.y + 30);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 12, bounds!.y + 30, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByRole('heading', { name: 'Work Index' })).toBeVisible();
  await expect(page.locator('.book-navigation output')).toContainText('Index 2 /');
});
