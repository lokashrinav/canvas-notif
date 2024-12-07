async function fetchAssignments(token) {
  try {
    const response = await fetch('https://canvas.instructure.com/api/v1/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const courses = await response.json();
    let assignments = [];
    for (const course of courses) {
      const courseAssignments = await fetch(
        `https://canvas.instructure.com/api/v1/courses/${course.id}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then((res) => res.json());
      assignments = [...assignments, ...courseAssignments];
    }
    console.log('Fetched assignments:', assignments); // Log fetched assignments
    return assignments;
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
}

function showNotification(assignment) {
  chrome.notifications.create({
    type: 'basic',
    title: 'Assignment Due Soon',
    message: `Your assignment "${assignment.name}" is due soon.`,
    priority: 2
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name); // Log when the alarm is triggered
  if (alarm.name === 'checkAssignments') {
    chrome.storage.sync.get('token', async ({ token }) => {
      if (!token) {
        console.log('No Canvas token found.');
        return;
      }
      console.log('Canvas token found:', token); // Log the token
      const assignments = await fetchAssignments(token);
      const now = new Date();
      assignments.forEach((assignment) => {
        const dueDate = new Date(assignment.due_at);
        console.log('Assignment due date:', dueDate); // Log the due date
        if (dueDate - now <= 24 * 60 * 60 * 1000) {
          console.log('Showing notification for assignment:', assignment.name); // Log when showing notification
          showNotification(assignment);
        }
      });
    });
  }
});