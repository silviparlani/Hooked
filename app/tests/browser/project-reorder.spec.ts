import { expect, test, type Page } from '@playwright/test';

async function dragCard(page: Page, touch: boolean, fromId: string, toId: string) {
  const from = await page.locator('[data-project-id="' + fromId + '"]').boundingBox();
  const to = await page.locator('[data-project-id="' + toId + '"]').boundingBox();
  if (!from || !to) throw new Error('Missing project cards');
  const x = from.x + from.width / 2;
  const y = from.y + from.height / 2;
  const endY = to.y + to.height * 0.8;
  if (touch) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await expect(page.locator('[data-project-id="' + fromId + '"]')).toHaveClass(/--chosen/);
    for (let step = 1; step <= 12; step++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + ((endY - y) * step) / 12 }],
      });
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, endY, { steps: 20 });
    await page.waitForTimeout(250);
    await page.mouse.up();
  }
}

for (const status of ['active', 'planned']) {
  test(
    status + ': whole-card drag saves, survives reload, and does not open the project',
    async ({ page, isMobile }) => {
      await page.goto('/?status=' + status);
      await expect(page.getByRole('button')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Project one', exact: true })).toBeVisible();
      await dragCard(page, isMobile, 'one', 'two');
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), 'order:' + status))
        .toBe(JSON.stringify(['two', 'one', 'three', 'four', 'five', 'six']));
      await expect(page).toHaveURL('/?status=' + status);
      await expect(page.locator('.project-list > .project-list-item').first()).toHaveAttribute(
        'data-project-id',
        'two',
      );
      await page.reload();
      await expect(page.locator('.project-list > .project-list-item').first()).toHaveAttribute(
        'data-project-id',
        'two',
      );
      // A second gesture verifies DOM and React stay synchronized after reordering.
      await dragCard(page, isMobile, 'two', 'one');
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), 'order:' + status))
        .toBe(JSON.stringify(['one', 'two', 'three', 'four', 'five', 'six']));
      await expect(page).toHaveURL('/?status=' + status);
    },
  );
}

test('a normal tap or click still opens the project', async ({ page, isMobile }) => {
  await page.goto('/?status=planned');
  const card = page.getByRole('link', { name: /Project one/ });
  if (isMobile) await card.tap();
  else await card.click();
  await expect(page).toHaveURL('/projects/one');
});

test('a quick swipe scrolls without reordering', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch-only scrolling');
  await page.goto('/?status=planned');
  const card = await page.locator('[data-project-id="two"]').boundingBox();
  if (!card) throw new Error('Missing card');
  const cdp = await page.context().newCDPSession(page);
  const x = card.x + card.width / 2;
  const y = card.y + card.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - step * 25 }],
    });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  expect(await page.evaluate(() => localStorage.getItem('order:planned'))).toBeNull();
  await expect(page).toHaveURL('/?status=planned');
  await cdp.detach();
});

test('holding a dragged card near the bottom scrolls to later projects', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch-only edge scrolling');
  await page.goto('/?status=planned');
  const card = await page.locator('[data-project-id="one"]').boundingBox();
  if (!card) throw new Error('Missing card');
  const cdp = await page.context().newCDPSession(page);
  const x = card.x + card.width / 2;
  const y = card.y + card.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await expect(page.locator('[data-project-id="one"]')).toHaveClass(/--chosen/);
  const bottom = page.viewportSize()!.height - 25;
  for (let step = 1; step <= 12; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y + ((bottom - y) * step) / 12 }],
    });
    await page.waitForTimeout(30);
  }
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page).toHaveURL('/?status=planned');
  await cdp.detach();
});

test('a cancelled touch drag restores the order without saving', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch cancellation');
  await page.goto('/?status=planned');
  const first = await page.locator('[data-project-id="one"]').boundingBox();
  const second = await page.locator('[data-project-id="two"]').boundingBox();
  if (!first || !second) throw new Error('Missing cards');
  const cdp = await page.context().newCDPSession(page);
  const x = first.x + first.width / 2;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y: first.y + first.height / 2 }],
  });
  await expect(page.locator('[data-project-id="one"]')).toHaveClass(/--chosen/);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: second.y + second.height * 0.8 }],
  });
  await page.waitForTimeout(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('.project-list > .project-list-item').first()).toHaveAttribute(
    'data-project-id',
    'one',
  );
  expect(await page.evaluate(() => localStorage.getItem('order:planned'))).toBeNull();
  await cdp.detach();
});
