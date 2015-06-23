// Generated by CoffeeScript 1.9.2
(function() {
  var Slack, autoMark, autoReconnect, slack, token;
  Slack = require('slack-client');
  token = 'xoxb-6000646994-4dBtgkOW3iCOiwGTv4l8xRWI';
  autoReconnect = true;
  autoMark = true;
  slack = new Slack(token, autoReconnect, autoMark);

var email   = require("emailjs");
var emailserver  = email.server.connect({
  user:    "app37559484@heroku.com", //process.env.MANDRILL_USERNAME, 
  password:"gZJb8olzVNKJc5RdYJKbxQ", //process.env.MANDRILL_APIKEY, 
  host:    "smtp.mandrillapp.com", 
  port:    465,
  ssl:     true
});

//accepts a slack userid and creates a slack userlink that will show up as a mention of that user
var makeMention = function(userId) {
  return '<@' + userId + '>';
};

//accepts a slack userid and returns their JSON user object
var getUserJSON = function(userId) {
  return slack.getUserByID(userId);
}

//accepts a slack user JSON object and returns their full name
var getUserFullName = function(user) {
  return user.profile.real_name;
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
var isPraise = function(messageText) {
  return messageText &&
    messageText.length > 9 &&
    messageText.toLowerCase().indexOf("#praise") !=-1;
};

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

var cleanPraiseText = function(messageText) { //accepts a string containing the initial user's entire praise text. replaces slack userids in the text with actual names
  var praiseText = messageText.split("<@"); //split text on <@ since that is what slack userid links start with
  for (index = 1; index < praiseText.length; ++index) { //skip the first element, which will just be text. the rest of the elements will start with a userid, so let's replace those userids with full names
    praiseText[index] = " " + getUserFullName(getUserJSON(praiseText[index].substring(0,9))) + praiseText[index].substring(10);
  }
  praiseText.join();
  return praiseText;
};

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
        response = text;
        emailserver.send({
          text:    response, 
          from:    user.real_name + " <" + user.profile.email + ">",
          to:      "helpdesk@352inc.com",
          //cc:      "else <else@your-email.com>",
          //bcc:      "else <else@your-email.com>",
          subject: text
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

    if (isPraise(message.text)) { //email praise details to courtney, linday, and christa, one email per user praised
      console.log("Received: " + type + " " + channelName + " " + userName + " " + ts + " \"" + text + "\"");
      if (type === 'message' && (text != null) && (channel != null)) {
        response = text;
        var praisedUsers = response.split("@"); //split text on @ since that will directly preceed userIDs
        praisedUsers.shift(); //remove the first element in the array since it will be text we don't care about
        praisedUsers = praisedUsers.map(trimUserString); //remove trailing > and text from each item in the array so we are left with just an array of userids
        praisedUsers = praisedUsers.map(getUserJSON); //convert the array of userIds to an array of full user JSON objects
        praisedUsers = praisedUsers.map(getUserFullName); //convert the array of JSON users to an array of usernames
        
        if (praisedUsers.length > 0 && user.profile.real_name !== praisedUsers[0]) {
          var emailTo = "condish@352inc.com, cgarcia@352inc.com, lclifton@352inc.com";
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

          var index;
          for (index = 0; index < praisedUsers.length; ++index) { //for each praised user, send an email out with the praise details
            emailserver.send({
              text:    user.profile.real_name + ' has praised ' + praisedUsers[index] + "\r\n" + cleanPraiseText(response), 
              from:    user.profile.real_name + " <" + user.profile.email + ">",
              to:      emailTo,
              //cc:      "else <else@your-email.com>",
              //bcc:      "else <else@your-email.com>",
              subject: channelName + " #praise for " + praisedUsers[index]
            }, function(err, message) { console.log(err || message); });
          }
          channel.send(user.profile.real_name + ' has praised ' + praisedUsers);
          return console.log("bot replied: " + user.profile.real_name + ' has praised ' + praisedUsers + "\r\n" + cleanPraiseText(response));
        } else if (user.profile.real_name == praisedUsers[0]) {
            channel.send(user.profile.real_name + ': did you just try to praise yourself? Bad form!');
            return console.log("bot replied: " + user.profile.real_name + ': did you just try to praise yourself? Bad form!' + "\r\n" + cleanPraiseText(response));
        }
          else {
            channel.send(user.profile.real_name + ': were you trying to praise someone? No @user found in your message ');
            return console.log("bot replied: " + user.profile.real_name + ': were you trying to praise someone? No @user found in your message ' + "\r\n" + cleanPraiseText(response));
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
  });

  slack.on('error', function(error) {
    return console.error("Error: " + error);
  });

  slack.login();

}).call(this);
