import {
  CloudFrontRequestEvent,
  CloudFrontRequestHandler,
  CloudFrontRequestResult,
  Context,
} from "aws-lambda";

import { AxiosError } from "axios";
import { parse } from "qs";
import {
  authenticate,
  isAuthenticated,
  makeLogoutCookieHeader,
  makeSetCookieHeader,
  renderTemplate,
} from "./services";
import { DOMAIN, REDIRECT_URL, ROOT_URL } from "./vars";

const LOGIN_RESPONSE: CloudFrontRequestResult = {
  headers: {
    location: [
      {
        key: "Location",
        value: "/login.php3",
      },
    ],
  },
  status: "302",
};

const isAxiosError = (err: any): err is AxiosError => err.config;

const setCookieAndRedirect = (
  url: string,
  cookie: string,
): CloudFrontRequestResult => ({
  headers: {
    Location: [
      {
        key: "Location",
        value: url,
      },
    ],
    "Set-Cookie": [
      {
        key: "Set-Cookie",
        value: cookie,
      },
    ],
  },
  status: "302",
});

export const handler: CloudFrontRequestHandler = async (
  event: CloudFrontRequestEvent,
  _context: Context,
): Promise<CloudFrontRequestResult> => {
  try {
    const request = event.Records[0].cf.request;

    const code = request.querystring ? parse(request.querystring).code : null;

    if (isAuthenticated(request)) {
      if (request.uri.endsWith("/logout.php3")) {
        console.log("logging out");

        return setCookieAndRedirect(REDIRECT_URL, makeLogoutCookieHeader());
      } else {
        console.log("auth ok");

        return request;
      }
    } else if (code) {
      try {
        console.log("checking code");
        const authResponse = await authenticate(code);

        if (authResponse.hd === DOMAIN) {
          console.log("login succeeded");

          return setCookieAndRedirect(
            ROOT_URL,
            makeSetCookieHeader(authResponse),
          );
        } else {
          console.error("non domain user - rejecting request");

          return {
            body: await renderTemplate(
              "Authentication failed - internal access only.",
            ),
            status: "401",
          };
        }
      } catch (err) {
        console.error("failed to authenticate user");

        if (isAxiosError(err) && err.response) {
          console.error(`code ${err.response.status}: ${err.response.data}`);
        }

        return {
          body: await renderTemplate(err.message),
          status: "500",
        };
      }
    } else if (request.uri.endsWith("/login.php3")) {
      console.log("login route - showing template");

      return {
        body: await renderTemplate(),
        status: "200",
      };
    } else {
      console.log("not authenticated & no code - redirecting to login");

      return LOGIN_RESPONSE;
    }
  } catch (err) {
    console.error(err);

    if (isAxiosError(err) && err.response) {
      console.error(`code ${err.response.status}: ${err.response.data}`);
    }

    return {
      body: "Server made a boo boo :(",
      status: "500",
    };
  }
};
