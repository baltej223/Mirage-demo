import {signInWithGoogle, signOutUser} from './auth.js';

// Call the signInWithGoogle function when the user clicks the "Sign in with Google" button
document.getElementById("google-sign-in").addEventListener("click", async () => {
  const user = await signInWithGoogle();
  if (user) {
    console.log("User signed in:", user);
  }
});



// Call the signOutUser function when the user clicks the "Sign out" button
document.getElementById("google-sign-out").addEventListener("click", async () => {
  await signOutUser();
  console.log("User signed out");
});