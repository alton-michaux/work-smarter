from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin

User = get_user_model()


class ApprovalUserAdmin(UserAdmin):
    """Self-service signups start inactive; approving one activates it."""

    list_display = ("email", "username", "is_active", "is_staff", "date_joined")
    list_filter = ("is_active", "is_staff", "is_superuser")
    ordering = ("-date_joined",)
    actions = ["approve_users"]

    @admin.action(description="Approve selected users")
    def approve_users(self, request, queryset):
        count = queryset.filter(is_active=False).update(is_active=True)
        self.message_user(request, f"Approved {count} user(s).", messages.SUCCESS)


admin.site.unregister(User)
admin.site.register(User, ApprovalUserAdmin)
