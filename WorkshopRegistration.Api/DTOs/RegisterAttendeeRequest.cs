using System.ComponentModel.DataAnnotations;

namespace WorkshopRegistration.Api.DTOs;

public class RegisterAttendeeRequest
{
    [Required]
    public int WorkshopId { get; set; }

    [Required]
    [MaxLength(150)]
    public string AttendeeName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string AttendeeEmail { get; set; } = string.Empty;
}