(function() {
  //set up slack client & email provider
  var Slack, autoMark, autoReconnect, slack, token, email, emailserver;
  Slack = require('slack-client');
  token = 'xoxb-6000646994-4dBtgkOW3iCOiwGTv4l8xRWI';
  autoReconnect = true;
  autoMark = true;
  slack = new Slack(token, autoReconnect, autoMark);
  email   = require("emailjs");
  emailserver  = email.server.connect({
	  user:    "app37559484@heroku.com", //process.env.MANDRILL_USERNAME, 
	  password:"gZJb8olzVNKJc5RdYJKbxQ", //process.env.MANDRILL_APIKEY, 
	  host:    "smtp.mandrillapp.com", 
	  port:    465,
	  ssl:     true
  });

//***********
//here there be functions...
//***********

//accepts a slack userid and creates a slack userlink that will show up as a mention of that user
var makeMention = function(userId) {
  return '<@' + userId + '>';
};

//accepts a slack userid and returns their JSON user object
var getUserJSON = function(userId) {
  if (userId) {
    return slack.getUserByID(userId);
  }
  return null;
}

//accepts a slack user JSON object and returns their full name
var getUserFullName = function(user) {
  if (user) {
    return user.profile.real_name;
  }
  return null;
}

//drops > and everything after it from a string. used to clean up our user arrays later on
var trimUserString = function(userstring) {
  return userstring.split(">")[0];
}
 
//check for #ticket to see if this is a helpdesk ticket submission
var isTicket = function(messageText) {
  return messageText &&
    messageText.length > 9 &&
    messageText.toLowerCase().indexOf("#ticket") !=-1;
};

//check for #praise to see if this is user praise
//var isPraise = function(messageText) {
//  return messageText &&
//    messageText.length > 9 &&
//    messageText.toLowerCase().indexOf("#praise") !=-1;
//};

//check for #roll to see if this is a dice rolling command
var isRoll = function(messageText) {
  return messageText &&
    messageText.length > 6 &&
    messageText.toLowerCase().substring(0,6) == "#roll " &&
    !isNaN(parseInt(messageText.substring(6)));
};

//check for #parrot command to tell bot what channel to say into and what to say in it
var isParrot = function(message) {
  return message.text &&
    message.text.length > 21 &&
    message.text.toLowerCase().substring(0,10) == "#parrot <#" &&
    slack.getUserByID(message.user) &&
    slack.getUserByID(message.user).name == "ecunningham";
  }

//check for #352culture tag and notify mcushing
var isCulture = function(messageText) {
  return messageText &&
    messageText.length > 12 &&
    messageText.toLowerCase().indexOf("#352culture") !=-1;
  }

//sanitize & shorten email subject
var cleanAndTrimSubject = function(emailSubject) {
  var trimmedSubject = emailSubject.split("\n");
  trimmedSubject = trimmedSubject[0];
  trimmedSubject = trimmedSubject.replace('#ticket ', '');
  trimmedSubject = trimmedSubject.replace('<http://', '');
  trimmedSubject = trimmedSubject.replace('<mailto:', '');
  var regex = /[^0-9A-Za-z @\.\|]/g;
  trimmedSubject = trimmedSubject.replace(regex, '');
  if (trimmedSubject.length > 100) { trimmedSubject = trimmedSubject.substring(0, 100); }
  return trimmedSubject;
}

var cleanUserText = function(messageText) { //accepts a string containing the initial user's entire message text. replaces slack userids in the text with actual names
  var cleanText = messageText.split("<@"); //split text on <@ since that is what slack userid links start with
  for (index = 1; index < cleanText.length; ++index) { //skip the first element, which will just be text. the rest of the elements will start with a userid, so let's replace those userids with full names
    cleanText[index] = " " + getUserFullName(getUserJSON(cleanText[index].substring(0,9))) + cleanText[index].substring(10);
  }
  return cleanText.join('');
};

//open the slack connection
  slack.on('open', function() { 
    var channel, channels, group, groups, id, messages, unreads;
    channels = [];
    groups = [];
    unreads = slack.getUnreadCount();
    channels = (function() {
      var ref, results;
      ref = slack.channels;
      results = [];
      for (id in ref) {
        channel = ref[id];
        if (channel.is_member) {
          results.push("#" + channel.name);
        }
      }
      return results;
    })();
    groups = (function() {
      var ref, results;
      ref = slack.groups;
      results = [];
      for (id in ref) {
        group = ref[id];
        if (group.is_open && !group.is_archived) {
          results.push(group.name);
        }
      }
      return results;
    })();
    console.log("Welcome to Slack. You are @" + slack.self.name + " of " + slack.team.name);
    console.log('You are in: ' + channels.join(', '));
    console.log('As well as: ' + groups.join(', '));
    messages = unreads === 1 ? 'message' : 'messages';
    return console.log("You have " + unreads + " unread " + messages);
  });

//********
//the meat of the program, listen & respond to messages
//********

  slack.on('message', function(message) {
    var channel, channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
    channel = slack.getChannelGroupOrDMByID(message.channel);
    user = slack.getUserByID(message.user);
    userName = (user != null ? user.name : void 0) != null ? user.name : "UNKNOWN_USER";
    response = '';
    type = message.type, ts = message.ts, text = message.text;
    channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
    channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
    
    if (isTicket(message.text)) { //email submission to helpdesk@352inc.com to create a devops ticket in JIRA
      console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
      if (type === 'message' && (text != null) && (channel != null)) {
        response = cleanUserText(text);
        emailserver.send({
          text:    response, 
          from:    user.real_name + " <" + user.profile.email + ">",
          to:      "helpdesk@352inc.com",
          //cc:      "else <else@your-email.com>",
          //bcc:      "else <else@your-email.com>",
          subject: cleanAndTrimSubject(response)
        }, function(err, message) { console.log(err || message); });
        channel.send(user.profile.email + ': your ticket has been submitted to the DevOps backlog!');
        return console.log(user.profile.email + ' submitted a ticket to the DevOps backlog! ticket text: ' + response);
      } else {
        typeError = type !== 'message' ? "unexpected type " + type + "." : null;
        textError = text == null ? 'text was undefined.' : null;
        channelError = channel == null ? 'channel was undefined.' : null;
        errors = [typeError, textError, channelError].filter(function(element) {
          return element !== null;
        }).join(' ');
        return console.log("@" + slack.self.name + " could not respond. " + errors);
      }
    }

    if (isCulture(message.text)) { //email & slack mention to mcushing@352inc.com
      console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
      if (type === 'message' && (text != null) && (channel != null)) {
        response = cleanUserText(text);
        emailserver.send({
          text:    response, 
          from:    user.real_name + " <" + user.profile.email + ">",
          to:      "mcushing@352inc.com",
          //cc:      "else <else@your-email.com>",
          //bcc:      "else <else@your-email.com>",
          subject: '#352culture slack mention'
        }, function(err, message) { console.log(err || message); });
        mcushing = slack.getChannelGroupOrDMByID('D0DA832NM'); //lookup the direct message channel for mcushing:devopsbot conversation
        mcushing.send(user.profile.email + 'has tagged #352culture! ' + response);
        return console.log(user.profile.email + ' mentioned #352culture! text: ' + response);
      } else {
        typeError = type !== 'message' ? "unexpected type " + type + "." : null;
        textError = text == null ? 'text was undefined.' : null;
        channelError = channel == null ? 'channel was undefined.' : null;
        errors = [typeError, textError, channelError].filter(function(element) {
          return element !== null;
        }).join(' ');
        return console.log("@" + slack.self.name + " could not respond. " + errors);
      }
    }
    
    if (isParrot(message)) { //parrot some text into a channel of the user's choice
      parrotChannelId = message.text.substring(10,19); //get the channelid from the beginning of the message
      parrotChannel = slack.getChannelGroupOrDMByID(parrotChannelId); //convert the channelid into a channel object
      if (parrotChannel && parrotChannel.name && parrotChannel.is_member) { //error handling and make sure bot is in the channel
        parrotChannel.send(message.text.substring(21));
        return console.log(userName + " told me to #parrot into channel #" + parrotChannel.name + ": " + message.text.substring(21));
      } else if (parrotChannel && parrotChannel.name && !parrotChannel.is_member) {
        return console.log("I'm not in channel #" + parrotChannel.name + "! " + userName + " gave an illegal command: " + message.text);
      } else {
        return console.log(userName + " gave an illegal command: " + message.text);
      }
    }

    if (isRoll(message.text)) { //roll the dice!
    	dieSize = parseInt(message.text.substring(6));
    	dieRoll = Math.floor((Math.random() * dieSize) + 1);
    	isCrit = '';
    	if (dieRoll == dieSize) {isCrit = ' CRITICAL HIT!';}
    	channel.send(userName + ' rolled ' + dieRoll + ' on a ' + dieSize + ' sided die.' + isCrit);
      return console.log(userName + ' rolled ' + dieRoll + ' on a ' + dieSize + ' sided die.' + isCrit);
    }

 /*  
    if (isPraise(message.text)) { //email praise details to courtney, linday, and christa, one email per user praised
      console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
      if (type === 'message' && (text != null) && (channel != null)) {
        response = text;
        var praisedUsers = response.split("<@"); //split text on <@ since that will directly preceed userIDs
        praisedUsers.shift(); //remove the first element in the array since it will be text we don't care about
        praisedUsers = praisedUsers.map(trimUserString); //remove trailing > and text from each item in the array so we are left with just an array of userids
        praisedUsers = praisedUsers.reduce(function(a,b){if(a.indexOf(b)<0)a.push(b);return a;},[]); //remove duplicates
        praisedUsers = praisedUsers.map(getUserJSON); //convert the array of userIds to an array of full user JSON objects
        praisedUsers = praisedUsers.map(getUserFullName); //convert the array of JSON users to an array of usernames
        
        if (praisedUsers.length > 0 && user.profile.real_name !== praisedUsers[0]) {
          var emailTo = "ecunningham@352inc.com, cgarcia@352inc.com, lclifton@352inc.com";
  /*
          switch(channelName) {
          	case '#tampa':
          		emailTo = "cgarcia@352inc.com";
          		break;
          	case '#gainesville':
          		emailTo = "condish@352inc.com";
          		break;
          	case '#atlanta':
          		emailTo = "lclifton@352inc.com";
          		break;
          	case '#staff-chat':
          		emailTo = "cgarcia@352inc.com, condish@352inc.com, lclifton@352inc.com"
          		break;
          }
  */

 /*
          var index;
          for (index = 0; index < praisedUsers.length; ++index) { //for each praised user, send an email out with the praise details
            emailserver.send({
              text:    channelName + ": " + user.profile.real_name + ' has praised ' + praisedUsers[index] + "\r\n" + cleanUserText(response), 
              from: "devops bot <devops@352inc.com>",
              //from:    user.profile.real_name + " <" + user.profile.email + ">",
              to:      emailTo,
              //cc:      "else <else@your-email.com>",
              //bcc:      "else <else@your-email.com>",
              subject: "#praise for " + praisedUsers[index]
            }, function(err, message) { console.log(err || message); });
          }
          channel.send(user.profile.real_name + ' has praised ' + praisedUsers);
          return console.log("bot replied: " + user.profile.real_name + ' has praised ' + praisedUsers + "\r\n" + cleanUserText(response));
        } else if (user.profile.real_name == praisedUsers[0]) {
            channel.send(user.profile.real_name + ': did you just try to praise yourself? Bad form!');
            return console.log("bot replied: " + user.profile.real_name + ': did you just try to praise yourself? Bad form!' + "\r\n" + cleanUserText(response));
        }
          else {
            channel.send(user.profile.real_name + ': were you trying to praise someone? No @user found in your message ');
            return console.log("bot replied: " + user.profile.real_name + ': were you trying to praise someone? No @user found in your message ' + "\r\n" + cleanUserText(response));
        }
        

      } else {
        typeError = type !== 'message' ? "unexpected type " + type + "." : null;
        textError = text == null ? 'text was undefined.' : null;
        channelError = channel == null ? 'channel was undefined.' : null;
        errors = [typeError, textError, channelError].filter(function(element) {
          return element !== null;
        }).join(' ');
        return console.log("@" + slack.self.name + " could not respond. " + errors);
      }
    }
  */


  });

  slack.on('error', function(error) {
    return console.error("Error: " + error);
  });

  slack.login();

}).call(this);
