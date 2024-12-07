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
      return assignments;
    } catch (error) {
      console.error('Error fetching assignments:', error);
      return [];
    }
  }
  
  function showNotification(assignment) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Upcoming Assignment',
      message: `${assignment.name} is due on ${assignment.due_at}`,
      priority: 2
    });
  }
  
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'checkAssignments') {
      chrome.storage.sync.get('token', async ({ token }) => {
        if (!token) {
          console.log('No Canvas token found.');
          return;
        }
        const assignments = await fetchAssignments(token);
        const now = new Date();
        assignments.forEach((assignment) => {
          const dueDate = new Date(assignment.due_at);
          if (dueDate - now <= 24 * 60 * 60 * 1000) {
            showNotification(assignment);
          }
        });
      });
    }
  });
  
  chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create('checkAssignments', { periodInMinutes: 30 });
  });
  