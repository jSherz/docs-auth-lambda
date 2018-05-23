import { promisify } from "util";
import { GOOGLE_CLIENT_ID, REDIRECT_URL } from "../vars";

import * as fs from "fs";

const fsReadFile = promisify(fs.readFile);

export const renderTemplate = async (error: string = "") => {
  const template = await fsReadFile("public/login.html");

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    "scope=email&" +
    "include_granted_scopes=true&" +
    `redirect_uri=${REDIRECT_URL}&` +
    "response_type=code&" +
    `client_id=${GOOGLE_CLIENT_ID}`;

  return template
    .toString("utf8")
    .replace("__LOGIN_URL__", url)
    .replace("__ERROR__", error)
    .replace(
      "__ERROR_STYLE__",
      error && error.length >= 1 ? "" : "display: none",
    );
};
