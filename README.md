# slack-devopsbot
A slackbot that handles automated JIRA ticket submission and tracks employee #praise

You must invite this bot to channels - it will listen on those channels and take appropriate actions

If the bot sees #ticket it will email helpdesk@352inc.com thus creating a JIRA ticket. The email will come FROM: the user who entered the text, so when JIRA creates the ticket it will send them an email confirmation with the ticket link & details.


If the bot sees #praise it will email condish@352inc.com once for each user tagged in the praise message - if you praise 5 people at once, courtney will receive 5 separate emails. each email will be FROM: the user who entered the #praise, and the subject lines will rotate through each of the praised users. the entire praise text will be in the body of the email.