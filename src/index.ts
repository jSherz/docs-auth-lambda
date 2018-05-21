import {
  CloudFrontRequest,
  CloudFrontRequestCallback,
  CloudFrontRequestEvent,
  Context,
} from "aws-lambda";

import * as cookie from "cookie";
import * as fs from "fs";
import * as jsonwebtoken from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT secret not set!");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGO = "HS256";

const isAuthenticated = (req: CloudFrontRequest) => {
  const rawCookie = req.headers.cookie[0].value;
  const cookies = cookie.parse(rawCookie);

  if (cookies.jwt) {
    try {
      jsonwebtoken.verify(cookies.jwt, JWT_SECRET, { algorithms: [ JWT_ALGO ] });

      return true;
    } catch (_err) {
      return false;
    }
  } else {
    return false;
  }
};

export const handler = async (
  event: CloudFrontRequestEvent,
  _context: Context,
  callback: CloudFrontRequestCallback,
) => {
  const request = event.Records[0].cf.request;

  if (isAuthenticated(request)) {
    callback(null, request);
  } else if (request) {
    fs.readFile("public/login.html", (err, data) => {
      if (err) {
        console.error("failed to read login page", err);
        throw err;
      } else {
        callback(null, {
          body: data.toString("utf8"),
          status: "401",
        });
      }
    });
  }
};
