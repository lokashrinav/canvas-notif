async function fetchAssignments(token) {
  try {
    const response = await fetch('https://canvas.instructure.com/api/v1/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const courses = await response.json();
    console.log('Fetched courses:', courses); // Log fetched courses

    let assignments = [];
    for (const course of courses) {
      const courseResponse = await fetch(
        `https://canvas.instructure.com/api/v1/courses/${course.id}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const courseAssignments = await courseResponse.json();
      console.log(`Fetched assignments for course ${course.id}:`, courseAssignments); // Log fetched assignments for each course

      if (Array.isArray(courseAssignments)) {
        assignments = [...assignments, ...courseAssignments];
      } else {
        console.error(`Assignments for course ${course.id} are not an array:`, courseAssignments);
      }
    }
    console.log('All fetched assignments:', assignments); // Log all fetched assignments
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
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Notification shown:', notificationId);
    }
  });
}

async function checkAssignments() {
  console.log('Checking assignments...'); // Log when checking assignments
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
      if (dueDate - now <= 365 * 24 * 60 * 60 * 1000) { // Check if due within the next year
        console.log('Showing notification for assignment:', assignment.name); // Log when showing notification
        showNotification(assignment);
      }
    });
  });
}

// Listen for changes to the token and check assignments immediately
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.token) {
    console.log('Token changed, checking assignments...');
    checkAssignments();
  }
});

// Set up an alarm to check assignments every hour
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, setting up alarm...');
  chrome.alarms.create('checkAssignments', { periodInMinutes: 60 });
});

// Log when the alarm is triggered
chrome.alarms.onAlarm.addListener((alarm) => {
  console.log('Alarm triggered:', alarm.name); // Log when the alarm is triggered
  if (alarm.name === 'checkAssignments') {
    checkAssignments();
  }
});