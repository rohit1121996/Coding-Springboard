import os

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create local demo accounts from environment-provided passwords."

    def handle(self, *args, **options):
        submitter_password = os.getenv("DEMO_SUBMITTER_PASSWORD")
        reviewer_password = os.getenv("DEMO_REVIEWER_PASSWORD")
        if not submitter_password or not reviewer_password:
            raise CommandError(
                "Set DEMO_SUBMITTER_PASSWORD and DEMO_REVIEWER_PASSWORD before running this command."
            )

        User = get_user_model()
        reviewer_group, _ = Group.objects.get_or_create(name="reviewer")
        for username, password, reviewer in [
            ("submitter", submitter_password, False),
            ("reviewer", reviewer_password, True),
        ]:
            user, _ = User.objects.get_or_create(username=username)
            user.set_password(password)
            user.save(update_fields=["password"])
            if reviewer:
                user.groups.add(reviewer_group)
            else:
                user.groups.remove(reviewer_group)

        self.stdout.write(self.style.SUCCESS("Demo users are ready: submitter and reviewer."))
