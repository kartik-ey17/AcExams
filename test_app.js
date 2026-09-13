async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log('--- TEST 1: GET /api/courses ---');
  const coursesRes = await fetch(`${baseUrl}/api/courses`);
  const courses = await coursesRes.json();
  console.log(`Status: ${coursesRes.status}`);
  console.log(`Courses count: ${courses.length}`);
  console.log(`First course: ${courses[0]?.name}, resources: ${courses[0]?.resources?.length}`);

  console.log('\n--- TEST 2: POST /api/topics ---');
  const topicsRes = await fetch(`${baseUrl}/api/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: 'os-101' }),
  });
  const topicsData = await topicsRes.json();
  console.log(`Status: ${topicsRes.status}`);
  console.log(`Topics count: ${topicsData.topics?.length}`);
  console.log('Sample topics:');
  topicsData.topics?.slice(0, 4).forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  console.log('\n--- TEST 3: POST /api/evaluate ---');
  const evalRes = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courseId: 'os-101',
      topic: 'Explain the different states of a process with a state transition diagram.',
      transcript: 'A process goes through five states: new, running, waiting, ready, and terminated. When a process is created it starts in new, moves to ready where it waits for CPU allocation, then runs. If it waits for IO, it moves to waiting state, and finally terminates when execution completes.',
    }),
  });
  const evalData = await evalRes.json();
  console.log(`Status: ${evalRes.status}`);
  console.log(`Overall Score: ${evalData.score} / 100`);
  console.log(`Concept Accuracy: ${evalData.conceptAccuracy}`);
  console.log(`Coverage: ${evalData.coverage}`);
  console.log(`Completeness: ${evalData.completeness}`);
  console.log(`Clarity: ${evalData.clarity}`);
  console.log(`Covered Concepts:`, evalData.covered);
  console.log(`Missed Concepts:`, evalData.missed);
  console.log(`AI Feedback: ${evalData.feedback}`);

  console.log('\n--- TEST 4: POST /api/upload (Contribute Flow) ---');
  const formData = new FormData();
  formData.append('courseId', 'os-101');
  formData.append('type', 'notes');
  formData.append('title', 'Deadlock and Synchronization');
  formData.append('textContent', 'Deadlock occurs when four conditions hold: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Solutions include Banker Algorithm for avoidance and Semaphore for synchronization.');
  formData.append('contributorName', 'Alice Hacker');
  formData.append('contributorUrl', 'https://github.com/alice');

  const uploadRes = await fetch(`${baseUrl}/api/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  console.log(`Status: ${uploadRes.status}`);
  console.log(`Upload success: ${uploadData.success}`);
  console.log(`Resource ID: ${uploadData.resource?.id}`);
  console.log(`Resource Title: ${uploadData.resource?.title}`);
  console.log(`Contributor: ${uploadData.resource?.contributorName} (${uploadData.resource?.contributorUrl})`);

  console.log('\n--- TEST 5: Verify Updated Course Resources ---');
  const updatedCoursesRes = await fetch(`${baseUrl}/api/courses`);
  const updatedCourses = await updatedCoursesRes.json();
  const osCourse = updatedCourses.find(c => c.id === 'os-101');
  console.log(`OS Resources count now: ${osCourse.resources.length} (was 3, now 4)`);

  console.log('\n--- TEST 6: Frontend Pages HTTP Status ---');
  for (const path of ['/', '/study', '/contribute']) {
    const res = await fetch(`${baseUrl}${path}`);
    console.log(`Page ${path}: HTTP ${res.status}`);
  }

  console.log('\n✅ ALL TESTS COMPLETE!');
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
