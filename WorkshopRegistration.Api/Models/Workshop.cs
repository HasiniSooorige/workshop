namespace WorkshopRegistration.Api.Models;

public class Workshop
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructor { get; set; } = string.Empty;
    public DateTime StartDateTime { get; set; }
    public int Capacity { get; set; }
    public string Status { get; set; } = "Scheduled";

    public ICollection<Registration> Registrations { get; set; }
        = new List<Registration>();
}