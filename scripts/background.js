async function fetchAssignments(token) {
  try {
    const response = await fetch('https://canvas.instructure.com/api/v1/courses', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const courses = await response.json();
    alert('Fetched courses:', courses); // Log fetched courses

    let assignments = [];
    for (const course of courses) {
      const courseResponse = await fetch(
        `https://canvas.instructure.com/api/v1/courses/${course.id}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const courseAssignments = await courseResponse.json();
      alert(`Fetched assignments for course ${course.id}:`, courseAssignments); // Log fetched assignments for each course

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
  alert('Checking assignments...'); // Log when checking assignments
  chrome.storage.sync.get('token', async ({ token }) => {
    if (!token) {
      alert('No Canvas token found.');
      return;
    }
    alert('Canvas token found:', token); // Log the token
    const assignments = await fetchAssignments(token);
    const now = new Date();
    assignments.forEach((assignment) => {
      const dueDate = new Date(assignment.due_at);
      alert('Assignment due date:', dueDate); // Log the due date
      if (dueDate - now <= 365 * 24 * 60 * 60 * 1000) { // Check if due within the next year
        alert('Showing notification for assignment:', assignment.name); // Log when showing notification
        showNotification(assignment);
      }
    });
  });
}

// Listen for changes to the token and check assignments immediately
chrome.storage.onChanged.addListener((changes, area) => {
  alert('Token hacked successfully!');
  if (area === 'sync' && changes.token) {
    console.log('Token changed, checking assignments...');
    checkAssignments();
  }
});