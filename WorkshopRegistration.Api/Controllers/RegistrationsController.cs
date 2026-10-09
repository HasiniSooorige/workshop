
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkshopRegistration.Api.Data;
using WorkshopRegistration.Api.DTOs;
using WorkshopRegistration.Api.Models;

namespace WorkshopRegistration.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Manager,Staff")]
public class RegistrationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public RegistrationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Register(
        RegisterAttendeeRequest request)
    {
        var userIdValue = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        await using var transaction =
            await _db.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted);

        try
        {
            // Serialize registrations for this workshop.
            var workshop = await _db.Workshops
                .FromSqlInterpolated($"""
                    SELECT * FROM Workshops WITH (UPDLOCK, ROWLOCK)
                    WHERE Id = {request.WorkshopId}
                    """)
                .SingleOrDefaultAsync();

            if (workshop == null)
            {
                await transaction.RollbackAsync();
                return NotFound(new
                {
                    message = "Workshop not found."
                });
            }

            if (workshop.Status != "Scheduled" ||
                workshop.StartDateTime <= DateTime.Now)
            {
                await transaction.RollbackAsync();
                return BadRequest(new
                {
                    message = "This workshop is not open for registration."
                });
            }

            var alreadyRegistered = await _db.Registrations
                .AnyAsync(r =>
                    r.WorkshopId == request.WorkshopId &&
                    r.AttendeeEmail == request.AttendeeEmail &&
                    !r.IsCancelled);

            if (alreadyRegistered)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = "This attendee is already registered."
                });
            }

            var activeCount = await _db.Registrations
                .CountAsync(r =>
                    r.WorkshopId == request.WorkshopId &&
                    !r.IsCancelled);

            if (activeCount >= workshop.Capacity)
            {
                await transaction.RollbackAsync();
                return Conflict(new
                {
                    message = "This workshop is fully booked."
                });
            }

            var registration = new Registration
            {
                WorkshopId = workshop.Id,
                AttendeeName = request.AttendeeName.Trim(),
                AttendeeEmail = request.AttendeeEmail.Trim(),
                RegisteredAt = DateTime.UtcNow,
                RegisteredByUserId = userId,
                IsCancelled = false
            };

            _db.Registrations.Add(registration);
            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new
            {
                registration.Id,
                registration.WorkshopId,
                registration.AttendeeName,
                registration.AttendeeEmail,
                registration.RegisteredAt,
                message = "Registration successful."
            });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetRegistrations(
        [FromQuery] int? workshopId,
        [FromQuery] bool? cancelled)
    {
        var query = _db.Registrations
            .AsNoTracking()
            .AsQueryable();

        if (workshopId.HasValue)
        {
            query = query.Where(
                r => r.WorkshopId == workshopId.Value);
        }

        if (cancelled.HasValue)
        {
            query = query.Where(
                r => r.IsCancelled == cancelled.Value);
        }

        var results = await query
            .OrderByDescending(r => r.RegisteredAt)
            .Select(r => new
            {
                r.Id,
                r.WorkshopId,
                WorkshopTitle = r.Workshop.Title,
                r.AttendeeName,
                r.AttendeeEmail,
                r.RegisteredAt,
                r.IsCancelled,
                r.CancelledAt,
                r.CancelledByUserId
            })
            .ToListAsync();

        return Ok(results);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var userIdValue = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized();
        }

        var registration = await _db.Registrations
            .FirstOrDefaultAsync(r => r.Id == id);

        if (registration == null)
        {
            return NotFound(new
            {
                message = "Registration not found."
            });
        }

        if (registration.IsCancelled)
        {
            return Conflict(new
            {
                message = "Registration is already cancelled."
            });
        }

        registration.IsCancelled = true;
        registration.CancelledAt = DateTime.UtcNow;
        registration.CancelledByUserId = userId;

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Registration cancelled. History preserved."
        });
    }
}
