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

function showWeeklyNotification(assignments) {
  const maxItems = 5; // Maximum items to display in the notification
  const items = assignments.slice(0, maxItems).map((assignment) => ({
    title: assignment.name,
    message: `Due: ${new Date(assignment.due_at).toLocaleString()}`,
  }));

  let message = 'Upcoming assignments due this week:';
  if (assignments.length > maxItems) {
    message += ` And ${assignments.length - maxItems} more...`;
  }

  chrome.notifications.create({
    type: 'list',
    iconUrl: chrome.runtime.getURL('images/icon.png'),
    title: 'Assignments Due This Week',
    message: message,
    items: items,
    priority: 2,
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Weekly notification shown:', notificationId);
    }
  });
}

async function checkAssignments() {
  console.log('Checking assignments...');
  chrome.storage.sync.get('token', async ({ token }) => {
    if (!token) {
      console.log('No Canvas token found.');
      return;
    }
    console.log('Canvas token found:', token);
    const assignments = await fetchAssignments(token);
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const upcomingAssignments = assignments.filter((assignment) => {
      const dueDate = new Date(assignment.due_at);
      return dueDate >= now && dueDate <= nextWeek;
    });

    if (upcomingAssignments.length > 0) {
      console.log('Assignments due this week:', upcomingAssignments);
      showWeeklyNotification(upcomingAssignments);
    } else {
      console.log('No assignments due this week.');
    }
  });
}

// Schedule the weekly alarm
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, setting up weekly alarm...');
  chrome.alarms.create('weeklyAssignmentCheck', {
    periodInMinutes: 10080, // 7 days * 24 hours * 60 minutes
  });
});

// Listen for the weekly alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'weeklyAssignmentCheck') {
    console.log('Weekly alarm triggered');
    checkAssignments();
  }
});

// Trigger the assignment check when the token changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.token) {
    console.log('Token changed, checking assignments...');
    checkAssignments();
  }
});