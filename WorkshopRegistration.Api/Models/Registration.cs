namespace WorkshopRegistration.Api.Models;

public class Registration
{
    public int Id { get; set; }
    public int WorkshopId { get; set; }
    public Workshop Workshop { get; set; } = null!;

    public string AttendeeName { get; set; } = string.Empty;
    public string AttendeeEmail { get; set; } = string.Empty;

    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public int RegisteredByUserId { get; set; }
    public User RegisteredByUser { get; set; } = null!;

    public bool IsCancelled { get; set; }
    public DateTime? CancelledAt { get; set; }
    public int? CancelledByUserId { get; set; }
}