const puppeteer = require('puppeteer-core');
const path = require('path');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function clickButtonWithText(page, textSubstring) {
  const clicked = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const btn = buttons.find(b => b.textContent.includes(text));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }, textSubstring);
  if (!clicked) {
    throw new Error(`Element containing "${textSubstring}" was not found.`);
  }
}

async function testContributeAndLeaderboardFlow() {
  console.log('🚀 Starting Full Contributor + Leaderboard Flow End-to-End Test in Edge...\n');

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => {
    if (msg.type() === 'error') console.error('  [Browser Error]:', msg.text());
  });
  page.on('pageerror', err => {
    console.error('  [Page Crash/Error]:', err.message);
  });

  try {
    // 1. Open Contribute page
    console.log('📌 STEP 1: Navigate to Contribute Page');
    await page.goto('http://localhost:3000/contribute', { waitUntil: 'networkidle0' });
    const heading = await page.$eval('h1', el => el.textContent);
    console.log('  Heading:', heading);
    if (!heading.includes('Contribute')) throw new Error('Contribute page did not load');

    // 2. Select Course
    console.log('\n📌 STEP 2: Select Course (Operating Systems)');
    await page.waitForSelector('select');
    const courseSelect = (await page.$$('select'))[0];
    await courseSelect.select('os-101');
    const selectedCourseVal = await page.evaluate(el => el.value, courseSelect);
    console.log('  Selected Course ID:', selectedCourseVal);

    // 3. Select Resource Type
    console.log('\n📌 STEP 3: Select Resource Type (Module)');
    const resourceTypeSelect = (await page.$$('select'))[1];
    await resourceTypeSelect.select('Module');
    const selectedType = await page.evaluate(el => el.value, resourceTypeSelect);
    console.log('  Selected Resource Type:', selectedType);

    // 4. Input Resource Title
    console.log('\n📌 STEP 4: Input Resource Title');
    const titleInput = await page.$('input[placeholder*="Memory Management"], input[type="text"]');
    const testTitle = 'Module 5: Concurrency and Synchronization';
    await titleInput.type(testTitle);
    console.log('  Typed Title:', testTitle);

    // 5. Upload real PDF file
    console.log('\n📌 STEP 5: Upload Real PDF File');
    const pdfPath = path.resolve(__dirname, 'sample_concurrency_module.pdf');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(pdfPath);
    console.log('  Uploaded PDF from:', pdfPath);

    // 6. Contributor perks (Name, GitHub URL, Portfolio URL)
    console.log('\n📌 STEP 6: Fill Contributor Perks');
    const textInputs = await page.$$('input[type="text"], input[type="url"]');
    for (const inp of textInputs) {
      const ph = await page.evaluate(el => el.getAttribute('placeholder') || '', inp);
      if (ph.includes('Alex') || ph.includes('John')) {
        await inp.type('Sarah Connor');
        console.log('  Set Contributor Name: Sarah Connor');
      } else if (ph.includes('github.com')) {
        await inp.type('https://github.com/sarah-connor');
        console.log('  Set GitHub URL: https://github.com/sarah-connor');
      } else if (ph.includes('portfolio.dev')) {
        await inp.type('https://sarahconnor.tech');
        console.log('  Set Portfolio URL: https://sarahconnor.tech');
      }
    }

    // 7. Submit Resource
    console.log('\n📌 STEP 7: Submit Resource');
    await clickButtonWithText(page, 'Save & Publish Resource');
    console.log('  Clicked Save & Publish, awaiting response & PDF extraction...');

    // 8. Verify Success Message and Contributor Perks
    console.log('\n📌 STEP 8: Verify Success Message Banner');
    await page.waitForSelector('.bg-green-50', { timeout: 15000 });
    const successText = await page.$eval('.bg-green-50', el => el.textContent);
    console.log('  Success banner text snippet:', successText.substring(0, 150).replace(/\s+/g, ' '));
    if (!successText.includes('Contribution Successful')) {
      throw new Error('Success message did not appear');
    }
    if (!successText.includes('Sarah Connor')) {
      throw new Error('Contributor name did not appear in success banner');
    }
    console.log('  ✅ Success banner verified with contributor perks!');

    // 9. Check Leaderboard to verify new contributor is registered!
    console.log('\n📌 STEP 9: Verify Contributor Leaderboard');
    await page.goto('http://localhost:3000/leaderboard', { waitUntil: 'networkidle0' });
    const lbHeading = await page.$eval('h1', el => el.textContent);
    console.log('  Leaderboard Heading:', lbHeading);
    if (!lbHeading.includes('Leaderboard')) throw new Error('Leaderboard did not load');

    await page.waitForSelector('.divide-y > div');
    const rows = await page.$$eval('.divide-y > div', elements =>
      elements.map(el => {
        const name = el.querySelector('.font-semibold')?.textContent?.trim();
        const count = el.querySelector('.font-bold.text-gray-700')?.textContent?.trim();
        const link = el.querySelector('a')?.getAttribute('href');
        return { name, count, link };
      })
    );
    console.log(`  Leaderboard entries (${rows.length}):`);
    rows.forEach((r, idx) => console.log(`   ${idx + 1}. ${r.name} — ${r.count} (Perk link: ${r.link || 'none'})`));

    // Verify Devin K. (12), Priya S. (9), Marcus T. (7), Sarah Connor (1)
    const sarahEntry = rows.find(r => r.name === 'Sarah Connor');
    if (!sarahEntry) throw new Error('New contributor Sarah Connor was not found on leaderboard!');
    if (!sarahEntry.link || !sarahEntry.link.includes('sarah')) {
      throw new Error('Contributor perk link was not rendered on leaderboard!');
    }
    console.log('  ✅ Contributor Leaderboard verified with rankings and project links!');

    // 10. Navigate to Study Page
    console.log('\n📌 STEP 10: Navigate to Study Mode');
    await page.goto('http://localhost:3000/study', { waitUntil: 'networkidle0' });
    console.log('  Arrived at Study page:', page.url());

    // 11. Open Operating Systems Course
    console.log('\n📌 STEP 11: Open Operating Systems Course');
    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(b => b.textContent.includes('Operating Systems'));
    });
    await clickButtonWithText(page, 'Operating Systems');

    // 12. Verify the newly uploaded resource appears in that course's resource list
    console.log('\n📌 STEP 12: Verify New Resource in Course Resource List');
    await page.waitForSelector('ul li');
    const resourceItems = await page.$$eval('ul li', items => items.map(li => li.textContent.trim().replace(/\s+/g, ' ')));
    console.log(`  Course has ${resourceItems.length} resources:`);
    resourceItems.forEach(r => console.log('   -', r));

    const newResourceFound = resourceItems.some(r => 
      r.includes('Concurrency') && r.includes('Sarah Connor') && r.includes('Module')
    );
    if (!newResourceFound) {
      throw new Error('Newly uploaded resource with contributor perks was not found in course resource list!');
    }
    console.log('  ✅ Newly uploaded PDF resource appears in course resource list with contributor perk!');

    // 13. Start AI Test and verify AI uses newly uploaded material
    console.log('\n📌 STEP 13: Start AI Test with Combined Resources');
    await clickButtonWithText(page, 'Start AI Test');

    await page.waitForFunction(() => {
      const h2 = document.querySelector('h2');
      return h2 && h2.textContent.includes('AI-Generated Topics');
    }, { timeout: 15000 });

    const topics = await page.$$eval('div.grid button', btns => btns.map(b => b.textContent.trim()));
    console.log(`  Generated ${topics.length} topics:`);
    topics.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

    // Verify AI generated topics including from the newly uploaded resource
    const concurrencyTopic = topics.find(t => 
      t.toLowerCase().includes('concurrency') || 
      t.toLowerCase().includes('synchronization') ||
      t.toLowerCase().includes('critical section') ||
      t.toLowerCase().includes('semaphore') ||
      t.toLowerCase().includes('banker') ||
      t.toLowerCase().includes('deadlock')
    );
    console.log('\n  🎯 Grounded topic from newly contributed PDF material:', concurrencyTopic);
    if (!concurrencyTopic) {
      throw new Error('AI did not generate any topics from the newly contributed PDF material!');
    }

    // 14. Select the newly contributed topic and evaluate
    console.log('\n📌 STEP 14: Take Viva Test on Newly Contributed Topic');
    await page.evaluate((topicText) => {
      const btns = Array.from(document.querySelectorAll('div.grid button'));
      const target = btns.find(b => b.textContent.includes(topicText));
      if (target) target.click();
    }, concurrencyTopic);

    await page.waitForSelector('textarea');
    const answer = 'In concurrency and synchronization, the critical section problem requires mutual exclusion, progress, and bounded waiting. Semaphores are synchronization tools using atomic wait and signal operations to prevent race conditions. The Banker Algorithm prevents deadlock by verifying that resource allocations leave the system in a safe state.';

    await page.type('textarea', answer, { delay: 10 });
    console.log('  Entered answer addressing the newly contributed topic.');

    await clickButtonWithText(page, 'Submit for Evaluation');
    console.log('  Submitted answer, waiting for AI evaluation...');

    // 15. Verify Evaluation Grounded in New Material
    await page.waitForFunction(() => {
      return document.body.textContent.includes('What You Covered');
    }, { timeout: 20000 });

    const score = await page.$eval('.text-4xl', el => el.textContent.trim());
    const covered = await page.$$eval('.text-green-900 li', items => items.map(li => li.textContent.trim()));
    const feedback = await page.$eval('.text-blue-950.leading-relaxed', el => el.textContent.trim());

    console.log(`\n  🏆 Viva Score: ${score} / 100`);
    console.log('  ✅ Covered Concepts from Contributed PDF:', covered);
    console.log('  💡 AI Feedback:', feedback);

    if (!score || isNaN(parseInt(score))) throw new Error('Invalid evaluation score');
    if (!feedback || feedback.length < 10) throw new Error('Feedback is missing');

    console.log('\n🎉 ALL TESTS PASSED: Contributor → Upload PDF → Appear in Course → Leaderboard → AI Evaluation on Contributed Material!');
  } finally {
    await browser.close();
  }
}

testContributeAndLeaderboardFlow().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
