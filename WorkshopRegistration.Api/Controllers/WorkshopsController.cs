
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkshopRegistration.Api.Data;
using WorkshopRegistration.Api.DTOs;
using WorkshopRegistration.Api.Models;

namespace WorkshopRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WorkshopsController : ControllerBase
{
    private readonly AppDbContext _db;

    public WorkshopsController(AppDbContext db)
    {
        _db = db;
    }

    // GET: api/workshops?status=Scheduled&available=true
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WorkshopResponse>>> GetAll(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] bool? available)
    {
        var query = _db.Workshops
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(w => w.Status == status);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(
                w => w.StartDateTime >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(
                w => w.StartDateTime <= toDate.Value);
        }

        if (available == true)
        {
            query = query.Where(w =>
                w.Status == "Scheduled" &&
                w.Registrations.Count(r => !r.IsCancelled) < w.Capacity);
        }

        var workshops = await query
            .OrderBy(w => w.StartDateTime)
            .Select(w => new WorkshopResponse
            {
                Id = w.Id,
                Code = w.Code,
                Title = w.Title,
                Instructor = w.Instructor,
                StartDateTime = w.StartDateTime,
                Capacity = w.Capacity,
                RegisteredCount = w.Registrations
                    .Count(r => !r.IsCancelled),
                AvailableSeats = w.Capacity -
                    w.Registrations.Count(r => !r.IsCancelled),
                Status = w.Status
            })
            .ToListAsync();

        return Ok(workshops);
    }

    // GET: api/workshops/1
    [HttpGet("{id:int}")]
    public async Task<ActionResult<WorkshopResponse>> GetById(int id)
    {
        var workshop = await _db.Workshops
            .AsNoTracking()
            .Where(w => w.Id == id)
            .Select(w => new WorkshopResponse
            {
                Id = w.Id,
                Code = w.Code,
                Title = w.Title,
                Instructor = w.Instructor,
                StartDateTime = w.StartDateTime,
                Capacity = w.Capacity,
                RegisteredCount = w.Registrations
                    .Count(r => !r.IsCancelled),
                AvailableSeats = w.Capacity -
                    w.Registrations.Count(r => !r.IsCancelled),
                Status = w.Status
            })
            .FirstOrDefaultAsync();

        if (workshop == null)
        {
            return NotFound(new { message = "Workshop not found." });
        }

        return Ok(workshop);
    }

    // POST: api/workshops
    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<ActionResult<WorkshopResponse>> Create(
        CreateWorkshopRequest request)
    {
        var codeExists = await _db.Workshops
            .AnyAsync(w => w.Code == request.Code);

        if (codeExists)
        {
            return Conflict(new
            {
                message = "A workshop with this code already exists."
            });
        }

        var workshop = new Workshop
        {
            Code = request.Code.Trim(),
            Title = request.Title.Trim(),
            Instructor = request.Instructor.Trim(),
            StartDateTime = request.StartDateTime,
            Capacity = request.Capacity,
            Status = "Scheduled"
        };

        _db.Workshops.Add(workshop);
        await _db.SaveChangesAsync();

        var response = new WorkshopResponse
        {
            Id = workshop.Id,
            Code = workshop.Code,
            Title = workshop.Title,
            Instructor = workshop.Instructor,
            StartDateTime = workshop.StartDateTime,
            Capacity = workshop.Capacity,
            RegisteredCount = 0,
            AvailableSeats = workshop.Capacity,
            Status = workshop.Status
        };

        return CreatedAtAction(
            nameof(GetById),
            new { id = workshop.Id },
            response);
    }

    // PUT: api/workshops/1
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(
        int id,
        UpdateWorkshopRequest request)
    {
        var workshop = await _db.Workshops
            .Include(w => w.Registrations)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workshop == null)
        {
            return NotFound(new { message = "Workshop not found." });
        }

        var allowedStatuses = new[]
        {
            "Scheduled",
            "Completed",
            "Cancelled"
        };

        if (!allowedStatuses.Contains(request.Status))
        {
            return BadRequest(new
            {
                message = "Status must be Scheduled, Completed, or Cancelled."
            });
        }

        var activeRegistrations = workshop.Registrations
            .Count(r => !r.IsCancelled);

        if (request.Capacity < activeRegistrations)
        {
            return BadRequest(new
            {
                message = $"Capacity cannot be lower than the {activeRegistrations} active registrations."
            });
        }

        workshop.Title = request.Title.Trim();
        workshop.Instructor = request.Instructor.Trim();
        workshop.StartDateTime = request.StartDateTime;
        workshop.Capacity = request.Capacity;
        workshop.Status = request.Status;

        await _db.SaveChangesAsync();

        return NoContent();
    }
}
