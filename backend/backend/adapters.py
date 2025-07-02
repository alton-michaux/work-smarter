from allauth.account.adapter import DefaultAccountAdapter

class NoVerifyEmailAdapter(DefaultAccountAdapter):
    def send_confirmation_mail(self, request, emailconfirmation, signup):
        print("sending confirmation email")
        emailconfirmation.confirm(request)  # Auto-confirm email
