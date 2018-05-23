/*
  The authentication Lambda@Edge function cannot have environment variables so
  we hard code these values in.

  Copy this file to vars.ts
 */

export const GOOGLE_CLIENT_ID = "";
export const GOOGLE_CLIENT_SECRET = "";
export const JWT_SECRET = "";
export const ROOT_URL = "http://localhost";
export const REDIRECT_URL = ROOT_URL + "/login.php3";
export const DOMAIN = "mycompany.com";
