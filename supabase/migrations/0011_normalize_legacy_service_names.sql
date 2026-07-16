-- Normalizes legacy job-title values inside workforce.services to the current
-- service-catalog names (src/data/Data.ts `services` / ServiceData.ts).
--
-- Root cause: ~180 legacy workforce rows were migrated using the old
-- "position applied for" vocabulary (e.g. "Painter", "Electrician") instead
-- of the customer-facing service catalog names (e.g. "Painting", "Electrical
-- Repair"). Everywhere else in the app — booking, notifications, User
-- Management's service filter — matches professionals against the catalog
-- names, so a professional whose services array still says "Painter" is
-- invisible to every "Painting" booking/notification/filter.
--
-- The current Career application form (Career.tsx) already writes catalog
-- names correctly (see servicesData2.map(s => s.name)), so this is a one-time
-- backfill for rows created before that, not an ongoing code bug.
--
-- Safe to run more than once — only rewrites elements that are still on the
-- legacy list, everything else in the array is left untouched.
-- Run this once in the Supabase SQL editor.

update workforce
set services = (
  select array_agg(
    case elem
      when 'Deep Cleaner' then 'Deep Cleaning'
      when 'Gardener' then 'Garden Care'
      when 'Mason' then 'Masonry Repair'
      when 'Plumber' then 'Plumbing Repair'
      when 'Electrician' then 'Electrical Repair'
      when 'Carpenter' then 'Carpentry'
      when 'Washing Machine Technician' then 'Washing Machine Repair'
      when 'EV Charger Installer' then 'EV Charger Installation'
      when 'AC Technician' then 'AC Services'
      when 'Painter' then 'Painting'
      when 'Packer & Mover' then 'Packing & Moving'
      when 'AirBnB Maintenance Specialist' then 'AirBnB Maintenance'
      when 'Bridal Makeup Artist' then 'Bridal Makeup'
      when 'RO Technician' then 'RO Water Purifying'
      when 'Refrigerator Technician' then 'Refrigerator Repair'
      when 'CCTV Technician' then 'CCTV Services'
      when 'Modular Kitchen Installer' then 'Modular Kitchen'
      when 'Home Renovation Specialist' then 'Home Renovation'
      when 'Pest Control Specialist' then 'Pest Control'
      when 'Drywall Repairer' then 'Drywall Repair'
      when 'Salon Specialist' then 'Salon at Home'
      when 'Tile Worker' then 'Tiling'
      when 'Home Chef' then 'Chef at Home'
      when 'Home Automation Specialist' then 'Home Automation'
      when 'Parquet Flooring Specialist' then 'Parqueting'
      when 'Indoor Plant Specialist' then 'Indoor Planting'
      when 'Spa Therapist' then 'Spa at Home'
      when 'Massage Therapist' then 'Massage Therapy'
      when 'Water Tank Cleaner' then 'Water Tank Cleaning'
      when 'Aluminum Fabricator' then 'Aluminum Fabrication'
      when 'False Ceiling Installer' then 'False Ceiling'
      when 'Computer Technician' then 'Computer Repair'
      when 'Geyser Technician' then 'Geyser Repair'
      when 'Chimney Technician' then 'Chimney Repair'
      when 'Tree Cutter & Pruner' then 'Tree Cutting & Pruning'
      when 'Septic Tank Cleaner' then 'Septic Tank Cleaning'
      when 'Pet Groomer' then 'Pet Grooming'
      when 'Lift/Elevator Technician' then 'Lift / Elevator Repair'
      else elem
    end
  )
  from unnest(services) as elem
)
where services && array[
  'Deep Cleaner', 'Gardener', 'Mason', 'Plumber', 'Electrician', 'Carpenter',
  'Washing Machine Technician', 'EV Charger Installer', 'AC Technician', 'Painter',
  'Packer & Mover', 'AirBnB Maintenance Specialist', 'Bridal Makeup Artist',
  'RO Technician', 'Refrigerator Technician', 'CCTV Technician',
  'Modular Kitchen Installer', 'Home Renovation Specialist', 'Pest Control Specialist',
  'Drywall Repairer', 'Salon Specialist', 'Tile Worker', 'Home Chef',
  'Home Automation Specialist', 'Parquet Flooring Specialist', 'Indoor Plant Specialist',
  'Spa Therapist', 'Massage Therapist', 'Water Tank Cleaner', 'Aluminum Fabricator',
  'False Ceiling Installer', 'Computer Technician', 'Geyser Technician',
  'Chimney Technician', 'Tree Cutter & Pruner', 'Septic Tank Cleaner', 'Pet Groomer',
  'Lift/Elevator Technician'
]::text[];
