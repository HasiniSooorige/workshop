using System.ComponentModel.DataAnnotations;

namespace WorkshopRegistration.Api.DTOs;

public class UpdateWorkshopRequest
{
    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Instructor { get; set; } = string.Empty;

    [Required]
    public DateTime StartDateTime { get; set; }

    [Range(1, 10000)]
    public int Capacity { get; set; }

    [Required]
    public string Status { get; set; } = "Scheduled";
}