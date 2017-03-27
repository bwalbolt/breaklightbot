(function() {
  //set up slack client & email provider
  var Slack, autoMark, autoReconnect, slack, token, email, emailserver;
  Slack = require('slack-client');
  token = 'xoxb-159544488848-5Xd1w9ouHdqXYxbItr5vYZbU';
  autoReconnect = true;
  autoMark = true;
  slack = new Slack(token, autoReconnect, autoMark);
  var emailserver  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

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

//check for #parrot command to tell bot what channel to say into and what to say in it
var isParrot = function(message) {
  return message.text &&
    message.text.length > 21 &&
    message.text.toLowerCase().substring(0,10) == "#parrot <#" &&
    slack.getUserByID(message.user);
  }

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
    
    if (isParrot(message)) { //parrot some text into a channel of the user's choice
      parrotChannelId = message.text.substring(10,19); //get the channelid from the beginning of the message
      parrotChannel = slack.getChannelGroupOrDMByID(parrotChannelId); //convert the channelid into a channel object
      parrotText = message.text.split(">")[1].trim(); //grab everything to the right of the first >, which indicates the end of the channelname
      if (parrotChannel && parrotChannel.name && parrotChannel.is_member) { //error handling and make sure bot is in the channel
        switch (parrotText) {
          case 'start':
            parrotChannel.send("Started. The clock is ticking; the H is O!");
            break;
          case 'snooze':
          case 'pause':
            parrotChannel.send("Snoozed. Lights are annoying, amirite?");
            break;
          default:
            parrotChannel.send(parrotText);
        }

        return console.log(userName + " told me to #parrot into channel #" + parrotChannel.name + ": " + parrotText);
      } else if (parrotChannel && parrotChannel.name && !parrotChannel.is_member) {
        return console.log("I'm not in channel #" + parrotChannel.name + "! " + userName + " gave an illegal command: " + message.text);
      } else {
        return console.log(userName + " gave an illegal command: " + message.text);
      }
    }

  });

  slack.on('message.im', function(message) {
    console.log(message);
  });

  slack.on('error', function(error) {
    return console.error("Error: " + error);
  });

  slack.login();

}).call(this);
