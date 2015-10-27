# slack-devopsbot
A slackbot that handles automated JIRA #ticket submission, tracks #352culture, and other miscellaneous fun bits.

You must invite this bot to channels - it will listen on those channels and take appropriate actions

If the bot sees #ticket it will email helpdesk@352inc.com thus creating a JIRA ticket. The email will come FROM: the user who entered the text, so when JIRA creates the ticket it will send them an email confirmation with the ticket link & details.

If the bot sees #352culture it will email mcushing@352inc.com with the message. The email will come FROM: the user who entered the text.

If the bot sees a message starting with #roll and followed by an integer X, it will roll an X-sided die and return the result.