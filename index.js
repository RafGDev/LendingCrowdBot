const request = require('request')
  , db = require("./lib/db.js")
  , nodemailer = require("nodemailer")
  , mail = require("./lib/sendMail.js")
  , EventEmitter = require("events").EventEmitter;

class LendingCrowdBot extends EventEmitter {
  constructor() {
    //running constructor of EventEmitter class
    super();

    //Setting properties to null state
    this.username = null;
    this.password = null;
    this.cookies = null;
    this.email = null;
    this.emailPass = null;
    this.smtServer = null;


    //Binding value of 'this' to runPoll function
    this.runPoll = this.runPoll.bind(this);

    this.cookieHeaders = {
      'Accept-Encoding': 'gzip, deflate, sdch, br',
      'Accept-Language': 'en-GB,en-US;q=0.8,en;q=0.6',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive',
    };
  }

  generateLoginHeaders(cookie) {
    return {
      'X-Lc-Rvt': 'B45844B2-C2FC-4E56-B879-327327440711',
      'Origin': 'https://lendingcrowd.co.nz',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'en-GB,en-US;q=0.8,en;q=0.6',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',
      'Content-Type': 'application/json;charset=UTF-8',
      'Cookie': cookie,
      'X-Lc-App': 'true',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://lendingcrowd.co.nz/user/signinform',
      'Connection': 'keep-alive',
    };
  }

  setup(arg) {
    this.username = arg.username;
    this.password = arg.password;
    this.email = arg.email;
    this.emailPass = arg.emailPass;
    this.smtServer = arg.smtServer;

    //Polling time is either 10 mins by default or users choice
    this.pollingTime = typeof arg.pollingTime === "undefined" ? 20000 : arg.PollingTime;
  }

  refreshCookies() {
    return new Promise((resolve, reject) => {
      const dataString = `{"username":"${this.username}","password":"${this.password}"}`;


      const cookieOptions = {
          url: 'https://lendingcrowd.co.nz/',
          headers: this.cookieHeaders,
      };


      request(cookieOptions, (err, res, body) => {
        if (!err && res.statusCode === 200) {
          this.cookie = res.headers['set-cookie'][0].split(" ")[0].trim();
          console.log("got first cookie");
              const loginInOptions = {
                url: 'https://lendingcrowd.co.nz/user/signin',
                method: 'POST',
                headers: this.generateLoginHeaders(this.cookie),
                body: dataString
              };

          request(loginInOptions, (err2, res2, body2) => {
            if (!err2 && res2.statusCode === 200) {

              this.cookie += " " + res2.headers['set-cookie'][1].split(" ")[0].trim();
              console.log("got second cookie");
              resolve();
            }
            else {
              reject(err2);
            }
          });
        }
        else {
          reject(err2);
        }

      });
    });
  }

  runPoll() {
    this.refreshCookies()
      .then(() => {;
      const pollingHeaders = {
        'X-Lc-Rvt': 'B45844B2-C2FC-4E56-B879-327327440711',
        'Accept-Encoding': 'gzip, deflate, sdch, br',
        'Accept-Language': 'en-GB,en-US;q=0.8,en;q=0.6',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36',

    'X-Lc-App': 'true',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://lendingcrowd.co.nz/investment/loanlistings',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
    'Cookie': this.cookie,
      };

      const pollingOptions = {
        url: 'https://lendingcrowd.co.nz/investment/readloanlistings?investmentAccountId=10605&page=1&pageSize=25',
        headers: pollingHeaders,
      };




      request(pollingOptions, (err, res, body ) => {
        if (!err && res.statusCode === 200) {
          try {
            const jsonBody = JSON.parse(body);
            console.log(jsonBody);
            if (jsonBody.obj.totalRecordCount !== 0) {
              jsonBody.obj.list.forEach((val) => {
                db.oneOrNone("SELECT id FROM financialBotApi WHERE loanid = $1", [val.id])
                .then((data) => {
                  if (data === null) {
                    db.none("INSERT INTO financialBotApi (id, loanid) VALUES (DEFAULT, $1)", [
                      val.id
                    ]);
                    mail.sendEmail({
                      email: this.email,
                      password: this.emailPass,
                      smtServer: this.smtServer,
                    },(err, info) => {
                      if (err) {
                        this.emit("pollingError", err);
                      }
                      else {
                        console.log("email sent");
                      }
                    })

                    }
                    else {
                      console.log("Already in db");
                    }
                })
                .catch((e) => {
                  this.emit("pollingError", e);
                })
              });
            }
          }
          catch(e) {
            this.emit("pollingError", e);
          }
        }
        else {
          this.emit("pollingError", err)
        }
      });
      })
      .catch((e) => {
        console.log(e);
      })
  }

  pollLoadLists() {
    this.runPoll();
    setInterval(this.runPoll, this.pollingTime);
  };
}
