/* exported getAccessToken */
/**
 * You must define your CLIENT_ID in the credentials.js file (ignored in .gitignore):
 * const CLIENT_ID = "YOUR_CLIENT_ID";
*/
const REDIRECT_URL = browser.identity.getRedirectURL();
const SCOPES = ["https://www.googleapis.com/auth/tasks"];
const AUTH_URL =
    `https://accounts.google.com/o/oauth2/auth
?client_id=${CLIENT_ID}
&response_type=token
&redirect_uri=${encodeURIComponent(REDIRECT_URL)}
&scope=${encodeURIComponent(SCOPES.join(' '))}`;
const VALIDATION_BASE_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";

function extractAccessToken(redirectUri) {
    let m = redirectUri.match(/[#?](.*)/);
    if (!m || m.length < 1)
        return null;
    let params = new URLSearchParams(m[1].split("#")[0]);
    return params.get("access_token");
}

/**
Validate the token contained in redirectURL.
This follows essentially the process here:
https://developers.google.com/identity/protocols/OAuth2UserAgent#tokeninfo-validation
- make a GET request to the validation URL, including the access token
- if the response is 200, and contains an "aud" property, and that property
matches the clientID, then the response is valid
- otherwise it is not valid

Note that the Google page talks about an "audience" property, but in fact
it seems to be "aud".
*/
function validate(redirectURL) {
    // when looking for redirect URL for auth tokens
    // see https://github.com/mdn/webextensions-examples/tree/master/google-userinfo
    // console.log("Redirect URL from browser.identity: " + browser.identity.getRedirectURL())
    // console.log("Redirect URL with auth token: " + redirectURL)
    const accessToken = extractAccessToken(redirectURL);
    if (!accessToken) {
        throw "Authorization failure";
    }
    const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;
    const validationRequest = new Request(validationURL, {
        method: "GET"
    });

    function checkResponse(response) {
        return new Promise((resolve, reject) => {
            if (response.status != 200) {
                reject("Token validation error");
            }
            response.json().then((json) => {
                if (json.aud && (json.aud === CLIENT_ID)) {
                    resolve(accessToken);
                } else {
                    reject("Token validation error");
                }
            });
        });
    }

    return fetch(validationRequest).then(checkResponse);
}

/**
Authenticate and authorize using browser.identity.launchWebAuthFlow().
If successful, this resolves with a redirectURL string that contains
an access token.
*/
function authorize() {
    // current Redirect URL is 
    // https://53fc361cb5542e05b4bea1f89ba18199892aa0c1.extensions.allizom.org/
    // which is for this id "phone-to-desktop-firefox@electron0zero.xyz"
    // used to see redirectURL, used for OAuth2
    // console.log("Redirect URL from browser.identity: " + browser.identity.getRedirectURL())
    return browser.identity.launchWebAuthFlow({
        interactive: true,
        url: AUTH_URL
    });
}

function getAccessToken() {
    return authorize().then(validate);

}
