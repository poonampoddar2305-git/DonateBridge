"""
URL routing configuration for core project.
"""
# pyrefly: ignore [missing-import]
from django.contrib import admin
# pyrefly: ignore [missing-import]
from django.urls import path, include
# pyrefly: ignore [missing-import]
from django.conf import settings
# pyrefly: ignore [missing-import]
from django.conf.urls.static import static

admin.site.site_header = "DonateBridge Admin Console"
admin.site.site_title = "DonateBridge Admin Portal"
admin.site.index_title = "DonateBridge Management & Verification Hub"

original_get_app_list = admin.AdminSite.get_app_list

def custom_get_app_list(self, request, app_label=None):
    app_list = original_get_app_list(self, request, app_label)

    # Priority ranking for apps
    APP_PRIORITY = {
        'donation': 1,
        'ngo': 2,
        'logistics': 3,
        'authentication': 4,
        'moderation': 5,
        'chat': 6,
        'auth': 7,
        'notification': 8,
    }

    # High-clarity user-friendly titles for Django Admin
    APP_NAMES = {
        'donation': 'Item Donations & Moderation',
        'ngo': 'NGO Verification & Profiles',
        'logistics': 'Logistics & Dispatch Jobs',
        'authentication': 'User Accounts & Roles',
        'moderation': 'Audit Logs & System Safety',
        'chat': 'Real-Time Communication',
        'auth': 'Groups & Django Permissions',
        'notification': 'Push Notifications'
    }

    for app in app_list:
        label = app['app_label'].lower()
        if label in APP_NAMES:
            app['name'] = APP_NAMES[label]

    app_list.sort(key=lambda x: APP_PRIORITY.get(x['app_label'].lower(), 99))

    # Priority ranking for models inside apps
    MODEL_PRIORITY = {
        'donation': ['donation', 'communitychallenge', 'wishlistitem'],
        'ngo': ['ngo', 'need', 'emergencycampaign', 'volunteerevent', 'volunteerregistration', 'ngodocument', 'ngoreview'],
        'logistics': ['logisticsjob'],
        'authentication': ['customuser', 'profile'],
        'moderation': ['auditlog', 'fraudlog'],
    }

    for app in app_list:
        label = app['app_label'].lower()
        if label in MODEL_PRIORITY:
            order = MODEL_PRIORITY[label]
            app['models'].sort(
                key=lambda m: order.index(m['object_name'].lower()) if m['object_name'].lower() in order else 99
            )

    return app_list

admin.AdminSite.get_app_list = custom_get_app_list

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('authentication.urls')),
    path('api/', include('ngo.urls')),
    path('api/', include('donation.urls')),
    path('api/', include('logistics.urls')),
    path('api/', include('chat.urls')),
    path('api/', include('moderation.urls')),
    path('api/', include('notification.urls')),
    path('api/', include('ai.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
