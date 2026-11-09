ALTER TABLE "day_off_balance" DROP CONSTRAINT "day_off_balance_valid";--> statement-breakpoint
ALTER TABLE "day_off_setting" DROP CONSTRAINT "day_off_setting_valid";--> statement-breakpoint
ALTER TABLE "day_off_balance" ADD COLUMN "vacation_annual_days" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "day_off_balance" ADD COLUMN "vacation_remaining_days" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "day_off_balance" ADD COLUMN "vacation_period_year" integer DEFAULT extract(year from now() at time zone 'Asia/Tbilisi')::int NOT NULL;--> statement-breakpoint
ALTER TABLE "day_off_setting" ADD COLUMN "default_vacation_days" integer DEFAULT 24 NOT NULL;--> statement-breakpoint
ALTER TABLE "vacation_request" ADD COLUMN "charged_vacation_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "day_off_balance" ADD CONSTRAINT "day_off_balance_valid" CHECK ("day_off_balance"."annual_days" between 0 and 366 and "day_off_balance"."remaining_days" between 0 and 3660 and "day_off_balance"."period_year" between 2000 and 2100 and "day_off_balance"."revision" >= 0 and "day_off_balance"."vacation_annual_days" between 24 and 366 and "day_off_balance"."vacation_remaining_days" between 0 and 100000 and "day_off_balance"."vacation_period_year" between 2000 and 2100);--> statement-breakpoint
ALTER TABLE "day_off_setting" ADD CONSTRAINT "day_off_setting_valid" CHECK ("day_off_setting"."id" = 1 and "day_off_setting"."default_days" between 0 and 366 and "day_off_setting"."revision" >= 0 and "day_off_setting"."default_vacation_days" between 24 and 366);--> statement-breakpoint
ALTER TABLE "vacation_request" ADD CONSTRAINT "vacation_request_charge_valid" CHECK ("vacation_request"."charged_vacation_days" between 0 and 366 and ("vacation_request"."charged_vacation_days" = 0 or ("vacation_request"."kind" = 'vacation' and "vacation_request"."status" = 'approved')));
--> statement-breakpoint
-- Reconstruct legacy approved charges from available effective schedules. Without a legacy schedule, use weekdays for initial reconciliation.
WITH easter(year, day) AS (VALUES
(2000, '2000-04-30'::date),
(2001, '2001-04-15'::date),
(2002, '2002-05-05'::date),
(2003, '2003-04-27'::date),
(2004, '2004-04-11'::date),
(2005, '2005-05-01'::date),
(2006, '2006-04-23'::date),
(2007, '2007-04-08'::date),
(2008, '2008-04-27'::date),
(2009, '2009-04-19'::date),
(2010, '2010-04-04'::date),
(2011, '2011-04-24'::date),
(2012, '2012-04-15'::date),
(2013, '2013-05-05'::date),
(2014, '2014-04-20'::date),
(2015, '2015-04-12'::date),
(2016, '2016-05-01'::date),
(2017, '2017-04-16'::date),
(2018, '2018-04-08'::date),
(2019, '2019-04-28'::date),
(2020, '2020-04-19'::date),
(2021, '2021-05-02'::date),
(2022, '2022-04-24'::date),
(2023, '2023-04-16'::date),
(2024, '2024-05-05'::date),
(2025, '2025-04-20'::date),
(2026, '2026-04-12'::date),
(2027, '2027-05-02'::date),
(2028, '2028-04-16'::date),
(2029, '2029-04-08'::date),
(2030, '2030-04-28'::date),
(2031, '2031-04-13'::date),
(2032, '2032-05-02'::date),
(2033, '2033-04-24'::date),
(2034, '2034-04-09'::date),
(2035, '2035-04-29'::date),
(2036, '2036-04-20'::date),
(2037, '2037-04-05'::date),
(2038, '2038-04-25'::date),
(2039, '2039-04-17'::date),
(2040, '2040-05-06'::date),
(2041, '2041-04-21'::date),
(2042, '2042-04-13'::date),
(2043, '2043-05-03'::date),
(2044, '2044-04-24'::date),
(2045, '2045-04-09'::date),
(2046, '2046-04-29'::date),
(2047, '2047-04-21'::date),
(2048, '2048-04-05'::date),
(2049, '2049-04-25'::date),
(2050, '2050-04-17'::date),
(2051, '2051-05-07'::date),
(2052, '2052-04-21'::date),
(2053, '2053-04-13'::date),
(2054, '2054-05-03'::date),
(2055, '2055-04-18'::date),
(2056, '2056-04-09'::date),
(2057, '2057-04-29'::date),
(2058, '2058-04-14'::date),
(2059, '2059-05-04'::date),
(2060, '2060-04-25'::date),
(2061, '2061-04-10'::date),
(2062, '2062-04-30'::date),
(2063, '2063-04-22'::date),
(2064, '2064-04-13'::date),
(2065, '2065-04-26'::date),
(2066, '2066-04-18'::date),
(2067, '2067-04-10'::date),
(2068, '2068-04-29'::date),
(2069, '2069-04-14'::date),
(2070, '2070-05-04'::date),
(2071, '2071-04-19'::date),
(2072, '2072-04-10'::date),
(2073, '2073-04-30'::date),
(2074, '2074-04-22'::date),
(2075, '2075-04-07'::date),
(2076, '2076-04-26'::date),
(2077, '2077-04-18'::date),
(2078, '2078-05-08'::date),
(2079, '2079-04-23'::date),
(2080, '2080-04-14'::date),
(2081, '2081-05-04'::date),
(2082, '2082-04-19'::date),
(2083, '2083-04-11'::date),
(2084, '2084-04-30'::date),
(2085, '2085-04-15'::date),
(2086, '2086-04-07'::date),
(2087, '2087-04-27'::date),
(2088, '2088-04-18'::date),
(2089, '2089-05-01'::date),
(2090, '2090-04-23'::date),
(2091, '2091-04-08'::date),
(2092, '2092-04-27'::date),
(2093, '2093-04-19'::date),
(2094, '2094-04-11'::date),
(2095, '2095-04-24'::date),
(2096, '2096-04-15'::date),
(2097, '2097-05-05'::date),
(2098, '2098-04-27'::date),
(2099, '2099-04-12'::date),
(2100, '2100-05-02'::date)
), charges AS (
 SELECT request.id, count(*) FILTER (WHERE
   CASE WHEN assignment.days IS NOT NULL THEN EXISTS (SELECT 1 FROM jsonb_array_elements(assignment.days) item WHERE (item->>'weekday')::int = extract(isodow from dates.day)::int AND item->'hours' <> 'null'::jsonb)
        WHEN version.effective_from IS NULL THEN extract(isodow from dates.day) BETWEEN 1 AND 5
        ELSE weekday.start_time IS NOT NULL AND weekday.end_time IS NOT NULL END
   AND to_char(dates.day, 'MM-DD') NOT IN ('01-01','01-02','01-07','01-19','03-03','03-08','04-09','05-09','05-12','05-17','05-26','08-28','10-14','11-23')
   AND NOT (dates.day::date BETWEEN easter.day - 2 AND easter.day + 1)
 )::int AS used
 FROM vacation_request request
 CROSS JOIN LATERAL generate_series(request.start_date, request.end_date, '1 day'::interval) dates(day)
 JOIN easter ON easter.year = extract(year from dates.day)::int
 LEFT JOIN LATERAL (SELECT effective_from FROM company_schedule WHERE effective_from <= dates.day::date ORDER BY effective_from DESC LIMIT 1) version ON true
 LEFT JOIN company_schedule_day weekday ON weekday.effective_from=version.effective_from AND weekday.weekday=extract(isodow from dates.day)::int
 LEFT JOIN employee person ON person.user_id=request.requester_id
 LEFT JOIN employee_work_schedule assignment ON assignment.employee_id=person.id
 WHERE request.kind='vacation' AND request.status='approved'
 GROUP BY request.id
)
UPDATE vacation_request request SET charged_vacation_days=charges.used FROM charges WHERE request.id=charges.id;
--> statement-breakpoint
WITH calendar AS (
 SELECT coalesce((SELECT timezone FROM company_schedule ORDER BY effective_from DESC LIMIT 1), 'Asia/Tbilisi') AS timezone
)
UPDATE day_off_balance balance SET vacation_period_year=extract(year from now() AT TIME ZONE calendar.timezone)::int,
 vacation_remaining_days=greatest(0, 24-(SELECT coalesce(sum(charged_vacation_days),0)::int FROM vacation_request request WHERE request.requester_id=balance.user_id AND request.kind='vacation' AND request.status='approved' AND extract(year from request.reviewed_at AT TIME ZONE calendar.timezone)=extract(year from now() AT TIME ZONE calendar.timezone))), revision=revision+1
FROM calendar;
--> statement-breakpoint
UPDATE day_off_setting SET revision=revision+1;
--> statement-breakpoint
INSERT INTO day_off_allowance_audit (target_user_id, action, reason, "after")
SELECT user_id, 'vacation_initialized', 'შვებულების საწყისი ბალანსი არსებული მოთხოვნების მიხედვით', jsonb_build_object('vacationAnnualDays', vacation_annual_days, 'vacationRemainingDays', vacation_remaining_days, 'year', vacation_period_year) FROM day_off_balance;
