from django.db import models

# Create your models here.
class Schedule(models.Model):
    TYPE_CHOICES = [('shift', 'Shift'), ('training', 'Training'), ('off', 'Off')]
    STATUS_CHOICE = [('assigned', 'Assigned'), ('completed', 'Completed'), ('absent', 'Absent')]

    employee_id = models.IntegerField()
    role = models.CharField(max_length=50)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    shift_date = models.DateField()
    start_time = models.TimeField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICE)
    branch_id = models.IntegerField(null=True, blank=True)
    availability_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'schedules'
    
    def __str__(self):
        return f"Schedule {self.id}"
    
    