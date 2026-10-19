-- Business profile (shown in reminder emails) and calendar feed token.
alter table business_settings add column if not exists business_name text;
alter table business_settings add column if not exists business_phone text;
alter table business_settings add column if not exists reply_to_email text;
alter table business_settings add column if not exists calendar_token uuid;
create unique index if not exists business_settings_calendar_token_idx on business_settings (calendar_token) where calendar_token is not null;
