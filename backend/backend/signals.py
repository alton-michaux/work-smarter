from django.dispatch import receiver
from allauth.account.signals import user_signed_up
from allauth.account.models import EmailAddress

@receiver(user_signed_up)
def create_verified_email(sender, request, user, **kwargs):
    EmailAddress.objects.update_or_create(
        user=user,
        email=user.email,
        defaults={'verified': True, 'primary': True}
    )
