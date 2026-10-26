from django.urls import path
from .views import (
    PendingNGOQueueView,
    AdminNGODetailView,
    AuditNGOView,
    PendingDonationQueueView,
    AuditDonationView,
    FraudLogListView,
    DismissFraudLogView,
    PlatformMetricsView,
    PendingDonorQueueView,
    AdminDonorDetailView,
    AuditDonorView
)

urlpatterns = [
    path('admin/ngos/pending/', PendingNGOQueueView.as_view(), name='admin_pending_ngos'),
    path('admin/ngos/<int:id>/', AdminNGODetailView.as_view(), name='admin_ngo_detail'),
    path('admin/ngos/<int:id>/audit/', AuditNGOView.as_view(), name='admin_audit_ngo'),
    path('admin/donors/pending/', PendingDonorQueueView.as_view(), name='admin_pending_donors'),
    path('admin/donors/<int:id>/', AdminDonorDetailView.as_view(), name='admin_donor_detail'),
    path('admin/donors/<int:id>/audit/', AuditDonorView.as_view(), name='admin_audit_donor'),
    path('admin/donations/pending/', PendingDonationQueueView.as_view(), name='admin_pending_donations'),
    path('admin/donations/<str:id>/audit/', AuditDonationView.as_view(), name='admin_audit_donation'),
    path('admin/fraud-logs/', FraudLogListView.as_view(), name='admin_fraud_logs'),
    path('admin/fraud-logs/<int:id>/', DismissFraudLogView.as_view(), name='admin_dismiss_fraud_log'),
    path('admin/metrics/', PlatformMetricsView.as_view(), name='admin_platform_metrics'),
]
