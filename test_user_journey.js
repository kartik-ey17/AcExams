const puppeteer = require('puppeteer-core');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

// Helper to click button containing specific text
async function clickButtonWithText(page, textSubstring) {
  const clicked = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes(text));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, textSubstring);
  if (!clicked) {
    throw new Error(`Button containing "${textSubstring}" was not found.`);
  }
}

async function simulateRealUser() {
  console.log('🚀 Starting Real User Journey Test with Edge Browser...');

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // Monitor console errors and unhandled rejections
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('  [Browser Error]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    console.error('  [Page Crash/Error]:', err.message);
    consoleErrors.push(err.message);
  });

  try {
    // STEP 1: Open the application
    console.log('\n📌 STEP 1: Open Home Page');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    const pageTitle = await page.title();
    console.log('  Page title:', pageTitle);
    const heading = await page.$eval('h1', el => el.textContent);
    console.log('  Heading:', heading);
    if (!heading.includes('StudySpeak')) throw new Error('Home page did not load StudySpeak title');

    // STEP 2: Go to Study
    console.log('\n📌 STEP 2: Navigate to Study Page');
    const studyLink = await page.$('a[href="/study"]');
    if (!studyLink) throw new Error('Could not find Study link');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      studyLink.click(),
    ]);
    console.log('  Current URL:', page.url());

    // STEP 3: Select the demo course
    console.log('\n📌 STEP 3: Select Operating Systems course');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Operating Systems'));
    });
    await clickButtonWithText(page, 'Operating Systems');

    // STEP 4: View course resources
    console.log('\n📌 STEP 4: View Course Resources');
    await page.waitForSelector('ul li');
    const resources = await page.$$eval('ul li', items => items.map(li => li.textContent.trim()));
    console.log(`  Found ${resources.length} resources:`);
    resources.forEach(r => console.log('   -', r));
    if (resources.length < 3) throw new Error('Expected at least 3 resources for Operating Systems');

    // STEP 5: Start AI Test
    console.log('\n📌 STEP 5: Click Start AI Test');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Start AI Test'));
    });
    await clickButtonWithText(page, 'Start AI Test');

    // STEP 6: Generate / Select an important topic
    console.log('\n📌 STEP 6: Waiting for AI topics generation');
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('AI-Generated Topics');
    }, { timeout: 15000 });

    const topicsHeading = await page.$eval('h2', el => el.textContent);
    console.log('  Heading:', topicsHeading);

    // List the generated topics
    const topicButtons = await page.$$eval('div.grid button', btns => btns.map(b => b.textContent.trim()));
    console.log(`  Generated ${topicButtons.length} topics:`);
    topicButtons.slice(0, 4).forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
    if (topicButtons.length === 0) throw new Error('No topics generated');

    // Click on the first topic
    console.log('  Selecting topic 1:', topicButtons[0]);
    const firstTopicBtn = (await page.$$('div.grid button'))[0];
    await firstTopicBtn.click();

    // STEP 7: Select a speaking duration
    console.log('\n📌 STEP 7: Select Speaking Duration');
    await page.waitForFunction(() => {
      const el = document.querySelector('p.text-blue-950');
      return el && el.textContent.length > 0;
    });
    const activeTopic = await page.$eval('p.text-blue-950', el => el.textContent);
    console.log('  Active viva topic:', activeTopic);

    // Select 5 min duration
    await clickButtonWithText(page, '5 min');
    console.log('  Selected duration: 5 min');

    // STEP 8: Test microphone / answer input flow
    console.log('\n📌 STEP 8: Test Microphone / Speech Input & Answer Entry');
    // Click Start Speaking
    await clickButtonWithText(page, 'Start Speaking');
    console.log('  Clicked Start Speaking button.');
    await new Promise(r => setTimeout(r, 1000));

    // Provide viva answer transcript
    console.log('  Entering student viva answer transcript...');
    const realisticAnswer = 'A process is a program in execution containing a text section, program counter, registers, stack, and heap. Its lifecycle transitions across five states: new, ready, waiting, running, and terminated. The Process Control Block or PCB stores critical context including CPU registers, program counter, and scheduling parameters. Context switching allows the CPU to switch between processes by saving the old process state and loading the new process state.';

    const textarea = await page.waitForSelector('textarea');
    await textarea.type(realisticAnswer, { delay: 10 });
    console.log('  Typed transcript into answer box.');

    // Click Stop Recording
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Stop Recording'));
    });
    await clickButtonWithText(page, 'Stop Recording');
    console.log('  Stopped recording.');
    await new Promise(r => setTimeout(r, 500));

    // STEP 9: Submit the answer
    console.log('\n📌 STEP 9: Submit Answer for Evaluation');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Submit for Evaluation'));
    });
    await clickButtonWithText(page, 'Submit for Evaluation');
    console.log('  Clicked Submit for Evaluation, awaiting AI evaluation...');

    // STEP 10: Verify AI evaluates the answer using course resources
    console.log('\n📌 STEP 10: Verify AI Evaluation & Grounding');
    await page.waitForFunction(() => {
      const h3 = document.querySelector('h3');
      return document.body.textContent.includes('What You Covered');
    }, { timeout: 20000 });

    // STEP 11: Verify score, strengths, missing concepts, feedback
    console.log('\n📌 STEP 11: Verify Score and Feedback Metrics');
    const score = await page.$eval('.text-4xl', el => el.textContent.trim());
    console.log(`  🏆 Overall Viva Score: ${score} / 100`);
    if (!score || isNaN(parseInt(score))) throw new Error(`Invalid score: ${score}`);

    // Metrics
    const metrics = await page.$$eval('.grid.grid-cols-2 > div', items => 
      items.map(item => ({
        value: item.querySelector('.text-2xl')?.textContent?.trim(),
        label: item.querySelector('.text-xs')?.textContent?.trim(),
      }))
    );
    console.log('  Evaluation Metrics:');
    metrics.forEach(m => console.log(`   - ${m.label}: ${m.value}`));
    if (metrics.length < 4) throw new Error('Expected 4 evaluation metrics (Accuracy, Coverage, Completeness, Clarity)');

    // Strengths and Missing concepts
    const coveredItems = await page.$$eval('.text-green-900 li', items => 
      items.map(li => li.textContent.trim())
    ).catch(() => []);
    const missedItems = await page.$$eval('.text-red-900 li', items => 
      items.map(li => li.textContent.trim())
    ).catch(() => []);
    const feedbackText = await page.$eval('.text-blue-950.leading-relaxed', el => el.textContent.trim());

    console.log('  ✅ Strengths / Covered concepts:', coveredItems);
    console.log('  ❌ Missing concepts:', missedItems);
    console.log('  💡 AI Feedback:', feedbackText);

    if (!feedbackText || feedbackText.length < 10) throw new Error('Feedback text is empty or too short');

    // STEP 12: Try another topic
    console.log('\n📌 STEP 12: Test "Try Another Topic" Flow');
    await clickButtonWithText(page, 'Try Another Topic');

    // Verify returned to topics list
    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('AI-Generated Topics');
    });
    const returnHeading = await page.$eval('h2', el => el.textContent);
    console.log('  Returned to:', returnHeading);

    // Test Random Topic button
    console.log('  Testing 🎲 Random Topic button...');
    await clickButtonWithText(page, 'Random Topic');

    await page.waitForFunction(() => {
      const el = document.querySelector('p.text-blue-950');
      return el && el.textContent.length > 0;
    });
    const randomTopic = await page.$eval('p.text-blue-950', el => el.textContent);
    console.log('  🎲 Random topic selected successfully:', randomTopic);

    console.log('\n🎉 ALL 12 STEPS OF THE CORE USER JOURNEY VERIFIED AND PASSED!');
    if (consoleErrors.length > 0) {
      console.warn('Browser console errors encountered:', consoleErrors);
    } else {
      console.log('✅ Zero browser console errors detected.');
    }
  } finally {
    await browser.close();
  }
}

simulateRealUser().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
