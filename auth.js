document.getElementById('googleLoginBtn').addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(error => {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  });
});
