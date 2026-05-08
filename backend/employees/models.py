from django.db import models

# Create your models here.
class Employee(models.Model): 
    first_name=models.CharField(max_length=100)
    last_name=models.CharField(max_length=100)
    email=models.EmailField(unique=True, null=True, blank=True)
    phone=models.CharField(max_length=100, null=True, blank=True)
    role=models.CharField(max_length=20, default='staff')
    date_hired=models.DateField()
    created_at=models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'employee'

    def __str__(self): 
        return f"{self.first_name} {self.last_name}"

class Availability(models.Model): 
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    available_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'availability'

    def __str__(self): 
        return f"{self.employee} - {self.available_date}"
