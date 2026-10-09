using Microsoft.EntityFrameworkCore;
using WorkshopRegistration.Api.Models;

namespace WorkshopRegistration.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Workshop> Workshops => Set<Workshop>();
    public DbSet<Registration> Registrations => Set<Registration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<Workshop>()
            .HasIndex(w => w.Code)
            .IsUnique();

        modelBuilder.Entity<Workshop>()
            .ToTable(t => t.HasCheckConstraint(
                "CK_Workshop_Capacity", "[Capacity] > 0"));

        modelBuilder.Entity<Registration>()
            .HasOne(r => r.Workshop)
            .WithMany(w => w.Registrations)
            .HasForeignKey(r => r.WorkshopId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Registration>()
            .HasOne(r => r.RegisteredByUser)
            .WithMany()
            .HasForeignKey(r => r.RegisteredByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}