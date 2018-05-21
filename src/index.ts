import {
  CloudFrontRequest,
  CloudFrontRequestEvent,
  CloudFrontRequestHandler,
  CloudFrontRequestResult,
  Context,
} from "aws-lambda";

import { google } from "googleapis";
import { parse } from "qs";
import { promisify } from "util";

import * as cookie from "cookie";
import * as fs from "fs";
import * as jsonwebtoken from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT secret not set!");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGO = "HS256";

const isAuthenticated = (req: CloudFrontRequest): boolean => {
  const rawCookie = req.headers.cookie[0].value;
  const cookies = cookie.parse(rawCookie);

  if (cookies.jwt) {
    try {
      jsonwebtoken.verify(cookies.jwt, JWT_SECRET, { algorithms: [JWT_ALGO] });

      return true;
    } catch (_err) {
      return false;
    }
  } else {
    return false;
  }
};

const fsReadFile = promisify(fs.readFile);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URL,
);

export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
  _context: Context,
): Promise<CloudFrontRequestResult> => {
  const request = event.Records[0].cf.request;

  const oauthCode = request.querystring ? parse(request.querystring).code : null;

  if (isAuthenticated(request)) {
    return request;
  } else if (oauthCode) {
    // TODO: authenticate
    return request;
  } else if (request.uri.endsWith("/login.php3")) {
    const template = await fsReadFile("public/login.html");
    const url = oauth2Client.generateAuthUrl({
      access_type: "online",
      scope: ["email"],
    });

    return {
      body: template.toString("utf8").replace("__LOGIN_URL__", url),
      status: "200",
    };
  } else {
    return {
      headers: {
        location: [{
          key: "Location",
          value: "/login.php3",
        }],
      },
      status: "302",
    };
  }
};
