console.log('Background script loaded');

async function fetchAssignments(token) {
  try {
    const response = await fetch('https://canvas.instructure.com/api/v1/courses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const courses = await response.json();

    let assignments = [];
    for (const course of courses) {
      const courseResponse = await fetch(
        `https://canvas.instructure.com/api/v1/courses/${course.id}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const courseAssignments = await courseResponse.json();
      if (Array.isArray(courseAssignments)) {
        assignments = [...assignments, ...courseAssignments];
      }
    }
    return assignments;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAssignments') {
    chrome.storage.sync.get('token', async ({ token }) => {
      if (!token) {
        sendResponse({ assignments: [] });
        return;
      }
      const assignments = await fetchAssignments(token);
      sendResponse({ assignments });
    });
    return true; // Indicates async response
  }
});