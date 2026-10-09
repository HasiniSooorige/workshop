namespace WorkshopRegistration.Api.DTOs;

public class WorkshopResponse
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructor { get; set; } = string.Empty;
    public DateTime StartDateTime { get; set; }
    public int Capacity { get; set; }
    public int RegisteredCount { get; set; }
    public int AvailableSeats { get; set; }
    public string Status { get; set; } = string.Empty;
}