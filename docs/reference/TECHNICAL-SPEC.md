# Extracted reference: Global PC Component Price Intelligence Platform-1.pdf

Authoritative source: `Brief/Global PC Component Price Intelligence Platform-1.pdf`

Generated: 2026-08-05

> Machine extraction for search and planning. Page markers correspond to the original PDF. Consult the PDF if layout matters.


===== PAGE 1 =====
Global PC Component Price Intelligence Platform
Technical Specification, Epics and Delivery Backlog
Document status:  Initial implementation specification
Target release:  Private beta MVP
Initial delivery period:  12 weeks
Sprint length:  Two weeks
Initial markets:  United States, Germany/Eurozone, United Kingdom and Japan
Initial categories:  DDR4 memory, DDR5 memory and consumer NVMe SSDs
1. Purpose
This document converts the product plan into a technical implementation specification.
It defines:
System architecture
Core services
Data model
Price-ingestion workflow
Product-matching workflow
Index calculations
Editorial and forecasting workflows
Public API requirements
User-facing features
Administration features
Security and privacy requirements
Engineering epics
User stories
Acceptance criteria
Sprint sequencing
Release gates
The MVP must allow the team to collect global and regional component-price data, publish market events
and analysis, calculate regional price indices and publish accountable buy-or-wait forecasts.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
1

===== PAGE 2 =====
2. MVP scope
2.1 Included
The MVP will support:
Global semiconductor-market overview
Four retail markets
Regional currencies
Regional retailer data
Canonical component catalogue
Daily price collection
Immutable raw price history
Daily category indices
Regional price comparison
Global market events
Regional event impacts
Editorial analysis
Buy-or-wait recommendations
Forecast publication
Forecast outcome tracking
Public methodology
Affiliate-link tracking
Newsletter signup
Internal editorial and data-administration interface
Basic operational monitoring
Mobile-responsive public website
2.2 Excluded
The MVP will not include:
User accounts
Saved watchlists
Personalised alerts
Paid subscriptions
Public API access for third parties
Automated AI-written articles
Automated forecasts without human approval
GPU or CPU tracking
Full build-price calculation
Native mobile applications
Live intraday pricing
Full multilingual publication
Retailer bidding or sponsored product rankings
Complete worldwide retail coverage•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
2

===== PAGE 3 =====
3. Product principles
3.1 Raw data must remain immutable
Imported price observations must never be overwritten.
Corrections must create separate correction records or updated derived records while preserving the
original observation.
3.2 Facts and analysis must be separated
The system must distinguish:
Source facts
Editorial interpretation
Forecast assumptions
Consumer recommendation
3.3 All public values must be traceable
Every displayed price, index, event and forecast must be traceable to:
Source
Collection date
Calculation version
Editorial author or automated process
Last review date
3.4 Incomplete data must be visible
The system must not conceal weak market coverage.
Every regional index must display a data-quality state.
3.5 Commercial relationships must not affect analysis
Affiliate commission, sponsorship or retailer relationships must not alter:
Product eligibility
Index composition
Event impact
Forecast direction
Consumer recommendation•
•
•
•
•
•
•
•
•
•
•
•
•
•
3

===== PAGE 4 =====
4. Recommended system architecture
The implementation should use a modular monolith for the MVP.
A microservice architecture would add unnecessary operational complexity at this stage.
The system should be divided logically into modules that can later be separated if required.
4.1 Core components
Public web application
Responsibilities:
Homepage
Global market pages
Regional pages
Category pages
Product pages
Event pages
Forecast pages
Methodology
Affiliate-link redirection
Newsletter signup
Internal administration application
Responsibilities:
Product review
Listing matching
Retailer administration
Region administration
Event creation
Source management
Forecast creation
Forecast review
Correction management
Data-quality review
Import monitoring
The public and administration applications may initially share the same codebase with role-based route
protection.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
4

===== PAGE 5 =====
Application API
Responsibilities:
Public read endpoints
Administration endpoints
Data queries
Validation
Authentication
Index retrieval
Forecast retrieval
Event and source relationships
Affiliate redirects
Relational database
Responsibilities:
Canonical entities
Product catalogue
Raw observations
Derived daily prices
Category baskets
Indices
Events
Sources
Forecasts
Corrections
Operational records
PostgreSQL is recommended.
Scheduled job runner
Responsibilities:
Retailer imports
Affiliate-feed imports
Marketplace API imports
Exchange-rate imports
Daily price derivation
Daily index generation
Forecast review reminders
Data-quality checks
Stale-data detection•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
5

===== PAGE 6 =====
Object storage
Responsibilities:
Raw feed files
Import snapshots
Source documents where permitted
Generated report assets
Chart exports
Audit artefacts
Monitoring and alerting
Responsibilities:
Import failures
API failures
Missing daily data
Stale exchange rates
Large price anomalies
Database errors
Background-job failures
Public-site availability
5. Suggested technology stack
The exact implementation language may be changed according to team skills.
5.1 Reference stack
Front end
Next.js
TypeScript
Server-rendered public pages
Responsive web design
Accessible charting library
Static generation where practical
Back end
Next.js server routes or a separate TypeScript application
Node.js
Type-safe validation
Background worker process•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
6

===== PAGE 7 =====
Database
PostgreSQL
Database migrations committed to source control
SQL or a mature ORM
Read replicas only when scale justifies them
Job scheduling
One of:
Scheduled server jobs
GitHub Actions
Cloud scheduler
Queue-based worker
Container cron process
Production jobs must use locking to prevent accidental duplicate execution.
Authentication
Passwordless or managed authentication for internal users
Role-based access control
Multi-factor authentication for administrative accounts where available
Charts
The chosen chart library must support:
Time-series lines
Event annotations
Tooltips
Region comparison
Currency formatting
Mobile layouts
Accessible labels
Data export later
6. Environments
The project must have at least three environments.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
7

===== PAGE 8 =====
6.1 Local development
Used for:
Engineering development
Test imports
Local database migrations
Unit tests
Production credentials must never be used locally.
6.2 Staging
Used for:
Team review
Private beta testing
Data-source integration testing
Editorial workflow testing
Release candidate validation
Staging should use separate retailer and affiliate credentials where providers support them.
6.3 Production
Used for:
Live data
Public pages
Real affiliate links
Final editorial publication
Production monitoring
7. User roles and permissions
7.1 Public visitor
Can:
View public pages
Select region
View current and historical prices
Read event analysis
Read forecasts•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
8

===== PAGE 9 =====
Use affiliate links
Subscribe to the newsletter
Cannot:
Modify data
View unpublished editorial content
View internal data-quality queues
7.2 Data reviewer
Can:
Review unmatched listings
Approve or reject product matches
Correct retailer metadata
Mark invalid observations
Review anomalies
Cannot:
Publish editorial analysis
Publish forecasts
Change user permissions
7.3 Editor
Can:
Create and edit events
Manage sources
Create regional impact assessments
Draft forecasts
Publish articles
Submit corrections
Cannot:
Change raw price observations
Manage system users unless separately authorised
7.4 Senior editor
Can:
Publish forecasts
Review forecast outcomes•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
9

===== PAGE 10 =====
Publish corrections
Override recommendations with documented justification
Approve methodology changes
7.5 Administrator
Can:
Manage users
Manage regions
Manage retailers
Configure data sources
View system logs
Retry jobs
Manage feature flags
7.6 Commercial user
Can:
Configure affiliate identifiers
View click analytics
Manage sponsor disclosure metadata
Review commercial reports
Cannot:
Change index eligibility
Change forecasts
Change editorial conclusions
8. Core data model
All main records should use UUID primary keys unless there is a strong technical reason not to.
All records should include:
created_at
updated_at
created_by  where applicable
updated_by  where applicable
Timestamps should be stored in UTC.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
10

===== PAGE 11 =====
9. Geographic and currency entities
9.1 Region
Represents a consumer-facing geographic market.
Suggested fields:
id
code
name
slug
region_group
country_code
default_currency_id
tax_display_type
is_public
is_retail_supported
coverage_status
launch_date
methodology_notes
Example values:
United States
Germany
United Kingdom
Japan
Eurozone overview
9.2 Currency
Fields:
id
iso_code
name
symbol
decimal_places
display_format•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
11

===== PAGE 12 =====
9.3 Exchange rate
Fields:
id
base_currency_id
quote_currency_id
rate
rate_date
provider
source_reference
collected_at
Constraints:
Unique base, quote and date
No future-dated rates unless explicitly marked as projections
10. Retail and affiliate entities
10.1 Retailer
Fields:
id
name
slug
website_domain
region_id
retailer_type
tax_included_by_default
marketplace_allowed
is_active
data_quality_rating
affiliate_program_id
notes
10.2 Affiliate programme
Fields:
id
name
network•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
12

===== PAGE 13 =====
programme_reference
default_commission_rate
cookie_duration_days
terms_url
permitted_data_usage
historical_storage_allowed
is_active
reviewed_at
10.3 Affiliate link template
Fields:
id
affiliate_program_id
region_id
url_template
tracking_parameter_name
campaign_identifier
sub_id_supported
is_active
10.4 Affiliate click
Fields:
id
occurred_at
region_id
retailer_id
canonical_product_id
source_page_type
source_page_id
campaign_code
anonymous_session_reference
destination_url
consent_state
Do not store unnecessary personally identifiable information.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
13

===== PAGE 14 =====
11. Product catalogue entities
11.1 Manufacturer
Fields:
id
name
slug
website
country_code
is_active
11.2 Product category
Fields:
id
name
slug
parent_category_id
unit_type
is_public
display_order
Initial categories:
Desktop memory
DDR4 desktop memory
DDR5 desktop memory
NVMe SSD
PCIe 4.0 NVMe SSD
11.3 Canonical product
Represents one exact manufacturer product.
Fields:
id
manufacturer_id
category_id
manufacturer_part_number
gtin
upc•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
14

===== PAGE 15 =====
ean
name
slug
status
release_date
discontinued_date
successor_product_id
technical_specification_json
primary_image_url
is_index_eligible
review_status
Relevant memory specifications:
Memory generation
Total capacity
Module count
Capacity per module
Speed
CAS latency
Voltage
ECC
Registered or unbuffered
Desktop DIMM or laptop SODIMM
XMP support
EXPO support
Relevant SSD specifications:
Capacity
Interface
PCIe generation
Form factor
NAND type where known
DRAM cache
Rated read speed
Rated write speed
Endurance
Heatsink included
11.4 Retailer listing
Represents a retailer-specific listing.
Fields:
id•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
15

===== PAGE 16 =====
retailer_id
external_listing_id
canonical_product_id
listing_title
listing_url
retailer_sku
manufacturer_part_number_raw
gtin_raw
matching_status
match_confidence
match_method
first_seen_at
last_seen_at
is_active
is_marketplace_listing
seller_name
listing_metadata_json
Matching statuses:
Unmatched
Suggested
Confirmed
Rejected
Ambiguous
Retired
12. Price entities
12.1 Raw price observation
This is an immutable record.
Fields:
id
retailer_listing_id
observed_at
currency_id
item_price
shipping_price
tax_amount
total_display_price
tax_included•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
16

===== PAGE 17 =====
stock_status
stock_quantity
seller_name
promotion_text
source_type
source_import_id
source_payload_reference
is_valid
invalid_reason
Stock statuses:
In stock
Low stock
Backorder
Preorder
Out of stock
Unknown
12.2 Daily product price
Derived from raw observations.
Fields:
id
canonical_product_id
region_id
price_date
currency_id
minimum_price
median_price
maximum_price
qualifying_offer_count
retailer_count
in_stock_offer_count
calculation_version
quality_status
generated_at
12.3 Price correction
Fields:
id
raw_price_observation_id•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
17

===== PAGE 18 =====
correction_type
reason
replacement_value_json
approved_by
approved_at
Corrections must not delete the original record.
13. Index entities
13.1 Index definition
Represents one tracked basket.
Fields:
id
name
slug
region_id
category_id
currency_id
description
calculation_method
outlier_method
minimum_product_count
minimum_retailer_count
tax_basis
is_public
effective_from
effective_to
calculation_version
Examples:
US 32GB DDR5-6000 Index
UK 64GB DDR5-6000 Index
Germany 2TB PCIe 4.0 SSD Index
13.2 Index eligibility rule
Fields:
id•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
18

===== PAGE 19 =====
index_definition_id
rule_type
field_name
operator
rule_value
display_description
Example rules:
Memory generation equals DDR5
Total capacity equals 32GB
Speed between 5600 and 6400
Module count equals two
ECC equals false
13.3 Index membership
Records the products included for a defined period.
Fields:
id
index_definition_id
canonical_product_id
effective_from
effective_to
inclusion_reason
approved_by
13.4 Daily index value
Fields:
id
index_definition_id
index_date
raw_median_price
indexed_value
minimum_price
maximum_price
product_count
retailer_count
coverage_percentage
quality_status
calculation_version
generated_at•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
19

===== PAGE 20 =====
13.5 Index composition change
Fields:
id
index_definition_id
change_date
change_type
product_id
reason
approved_by
notes
14. Event and source entities
14.1 Source organisation
Fields:
id
name
source_type
website
reliability_tier
notes
Source types:
Manufacturer
Regulator
Government
Market research
Financial publication
Technology publication
Retailer
Community
Other
14.2 Source item
Represents an individual article, announcement or report.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
20

===== PAGE 21 =====
Fields:
id
source_organisation_id
title
url
publication_date
accessed_at
author
content_type
rights_notes
summary
is_primary_source
14.3 Market event
Fields:
id
title
slug
event_date
publication_status
global_summary
fact_summary
editorial_analysis
event_type
default_direction
default_strength
expected_delay_min_days
expected_delay_max_days
confidence
review_date
author_id
published_at
14.4 Event source relationship
Fields:
id
market_event_id
source_item_id
relationship_type
supports_event
supports_interpretation•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
21

===== PAGE 22 =====
contradicts_interpretation
editor_notes
14.5 Event category impact
Fields:
id
market_event_id
category_id
impact_direction
impact_strength
expected_delay_min_days
expected_delay_max_days
confidence
rationale
14.6 Event regional impact
Fields:
id
market_event_id
region_id
impact_direction
impact_strength
currency_effect
inventory_effect
expected_delay_min_days
expected_delay_max_days
confidence
rationale
reviewed_at
15. Forecast entities
15.1 Forecast
Fields:
id
title
slug
region_id•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
22

===== PAGE 23 =====
index_definition_id
published_at
forecast_start_date
forecast_end_date
direction
expected_change_min_percentage
expected_change_max_percentage
confidence_percentage
consumer_recommendation
summary
supporting_evidence
contradictory_evidence
invalidation_conditions
status
author_id
approved_by
Forecast statuses:
Draft
Pending approval
Published
Under review
Scored
Withdrawn
15.2 Forecast evidence link
Fields:
id
forecast_id
market_event_id
source_item_id
relationship_type
weight
notes
15.3 Forecast result
Fields:
id
forecast_id
reviewed_at
starting_index_value•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
23

===== PAGE 24 =====
ending_index_value
actual_change_percentage
actual_direction
direction_correct
within_forecast_range
midpoint_error_percentage_points
result_classification
review_notes
reviewed_by
Result classifications:
Correct
Mostly correct
Partially correct
Incorrect
Unable to score
16. Operational entities
16.1 Data source configuration
Fields:
id
name
source_type
region_id
retailer_id
schedule
configuration_json
credential_reference
is_active
last_success_at
last_failure_at
Credentials must not be stored directly in normal database fields.
16.2 Import run
Fields:
id
data_source_configuration_id•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
24

===== PAGE 25 =====
started_at
completed_at
status
records_received
records_created
records_updated
records_rejected
warning_count
error_message
raw_file_reference
16.3 Data-quality issue
Fields:
id
issue_type
severity
entity_type
entity_id
description
detected_at
status
assigned_to
resolved_at
resolution_notes
17. Data-ingestion workflow
Each source integration should follow the same pipeline.
17.1 Import stages
Fetch data.
Save the raw response or feed file.
Validate the source format.
Parse records.
Identify or create retailer listings.
Attempt canonical product matching.
Create immutable raw price observations.
Run anomaly checks.
Mark records as valid or requiring review.
Produce an import summary.
Trigger downstream daily derivation where appropriate.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
11.
25

===== PAGE 26 =====
17.2 Import idempotency
Repeated processing of the same source response must not produce duplicate records.
Suggested uniqueness:
Source
External listing ID
Observation timestamp
Price
Source record identifier
17.3 Failure handling
When an import fails:
Record the failure.
Preserve partial progress only where safe.
Alert the responsible team.
Do not publish incomplete derived data silently.
Allow an authorised user to retry the import.
Prevent simultaneous retries.
18. Product-matching workflow
18.1 Matching priority
The automated matcher should use:
Exact manufacturer part number
Exact GTIN, UPC or EAN
Existing retailer SKU mapping
Normalised manufacturer and part-number combination
Structured specification match
Fuzzy title match as a last resort
18.2 Match confidence
Suggested thresholds:
0.98–1.00: automatic confirmation
0.90–0.979: suggested confirmation
0.70–0.899: manual review required
Below 0.70: unmatched•
•
•
•
•
•
•
•
•
•
•
1.
2.
3.
4.
5.
6.
•
•
•
•
26

===== PAGE 27 =====
Automatic thresholds should be configurable.
18.3 Manual review screen
The reviewer must see:
Retailer listing title
Retailer URL
Extracted manufacturer
Extracted part number
Extracted specifications
Suggested canonical products
Differences between listing and canonical product
Historical reviewer decisions
Confidence score
Available actions:
Confirm match
Select different product
Create new canonical product
Reject listing
Mark as ambiguous
Mark as unsupported category
19. Price qualification rules
A raw observation should be excluded from normal indices when:
Product matching is unconfirmed
Listing is out of stock
Listing is a marketplace seller and the index excludes marketplaces
Product condition is used or refurbished
Listing is a bundle
Shipping cost is unavailable where materially relevant
Price is clearly erroneous
Retailer listing has changed product
Tax treatment is unknown and cannot be normalised
Listing violates regional methodology
Excluded observations remain stored.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
27

===== PAGE 28 =====
20. Daily product-price calculation
For each canonical product and region:
Select valid observations within the relevant collection window.
Use the latest qualifying observation per retailer .
Calculate total consumer price according to regional methodology.
Calculate minimum, median and maximum.
Count offers and retailers.
Assign quality state.
Store the daily derived record.
Suggested collection window:
Latest valid observation within 36 hours for a daily index
If insufficient data exists:
Do not fabricate a value.
Mark the day as incomplete.
Use gaps in the chart or a clearly labelled carry-forward rule if the methodology permits it.
21. Daily index calculation
21.1 MVP calculation
For each index:
Retrieve eligible products with valid daily product prices.
Enforce minimum retailer and product counts.
Apply documented outlier rules.
Calculate the median regional price.
Calculate index value relative to the defined baseline.
Store coverage and quality metadata.
Save the calculation version.
21.2 Indexed comparison
Formula:
Indexed Value = Current Basket Value / Baseline Basket Value × 100
The baseline date must be visible.1.
2.
3.
4.
5.
6.
7.
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
28

===== PAGE 29 =====
When index composition changes materially:
Either chain the index using a documented method, or
Begin a new calculation version.
21.3 Data-quality states
High confidence
Meets or exceeds target product count
Meets retailer target
Majority of products in stock
No unresolved severe anomalies
Moderate confidence
Minimum publication threshold met
Some missing products or retailers
No severe integrity issue
Limited confidence
Barely meets minimum threshold
Low stock coverage
Significant regional gaps
Insufficient data
Publication threshold not met
Index value not published as authoritative
22. Public API specification
The MVP API is internal to the public site but should be structured cleanly for future external use.
22.1 General requirements
JSON responses
Versioned endpoints
Stable identifiers
Pagination
Input validation
Rate limiting
Caching for public data
No unpublished content returned publicly•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
29

===== PAGE 30 =====
Consistent error format
22.2 Proposed public endpoints
Regions
GET /api/v1/regions
Returns supported regions.
GET /api/v1/regions/{slug}
Returns regional metadata.
Categories
GET /api/v1/categories
GET /api/v1/categories/{slug}
Indices
GET /api/v1/indices
Filters:
Region
Category
Status
GET /api/v1/indices/{slug}
GET /api/v1/indices/{slug}/history
Parameters:
Start date
End date
Currency mode
Indexed or raw
Products
GET /api/v1/products/{slug}
GET /api/v1/products/{slug}/prices•
•
•
•
•
•
•
•
30

===== PAGE 31 =====
Events
GET /api/v1/events
Filters:
Region
Category
Event type
Date range
GET /api/v1/events/{slug}
Forecasts
GET /api/v1/forecasts
GET /api/v1/forecasts/{slug}
GET /api/v1/forecast-scorecard
Market overview
GET /api/v1/market-overview
Returns:
Global status
Regional summaries
Featured indices
Recent events
Active recommendations
Scorecard summary
23. Administration API
Administration endpoints must require authentication and appropriate permissions.
Examples:
Create and update canonical products
Confirm listing matches
Retry imports
Create events
Attach sources•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
31

===== PAGE 32 =====
Create regional impacts
Draft forecasts
Approve forecasts
Score forecasts
Publish corrections
Update methodology version
Manage retailers and regions
All administrative writes must create audit records.
24. Public page requirements
24.1 Homepage
Must display:
Global DRAM status
Global NAND status
Current overall direction
Active global forecast
Regional comparison
Featured price indices
Recent market events
Buy-or-wait summaries
Forecast scorecard
Newsletter signup
Acceptance criteria:
A first-time visitor can identify the global direction within five seconds.
Every status includes a last-updated time.
Every recommendation includes confidence.
Regional comparison works on mobile.
No price is shown without currency and tax context.
24.2 Regional page
Must display:
Region name
Local currency
Tax treatment
Regional market status
Regional indices
Regional event impacts•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
32

===== PAGE 33 =====
Currency effect
Buy-or-wait recommendations
Retailer links
24.3 Category page
Must display:
Category description
Global trend
Regional trends
Historical chart
Event annotations
Active forecast
Forecast history
Current products
Methodology link
24.4 Product page
Must display:
Exact canonical product
Key specifications
Regional retailer offers
Price history
Comparison with category median
Current availability
Affiliate disclosure
Data freshness
Error-report option
24.5 Event page
Must display:
Event date
Fact summary
Editorial analysis
Sources
Categories affected
Regional impacts
Expected delay
Confidence
Related forecasts
Review status•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
33

===== PAGE 34 =====
24.6 Forecast page
Must display:
Region
Category
Forecast horizon
Expected direction
Expected range
Confidence
Recommendation
Supporting evidence
Contradictory evidence
Invalidation conditions
Outcome when available
25. Editorial administration requirements
25.1 Event editor
The editor must be able to:
Enter title
Enter event and publication dates
Attach sources
Mark primary sources
Write fact summary
Write analysis
Select categories
Select global and regional impacts
Add expected delays
Add confidence
Set review date
Preview and publish
25.2 Forecast editor
The editor must be able to:
Select region and index
Select time horizon
Enter expected range
Enter confidence
Select recommendation•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
34

===== PAGE 35 =====
Attach evidence
Add contradictory evidence
Add invalidation conditions
Preview
Submit for approval
Publish
A forecast cannot be published without:
At least one source or market event
Supporting evidence
Contradictory evidence or explicit statement that none was identified
Review date
Confidence level
Approval by an authorised role
26. Forecast-scoring requirements
A scheduled job should detect forecasts whose end date has passed.
The system should:
Retrieve start and end index values.
Calculate actual change.
Determine actual direction.
Test whether direction was correct.
Test whether result fell within the forecast range.
Calculate midpoint error .
Create a draft forecast result.
Notify an editor .
Require editorial review before publication.
The public scorecard must not exclude failed forecasts unless they are marked unable to score with a visible
reason.
27. Non-functional requirements
27.1 Performance
Targets:
Public page initial response under one second where cached
Main content usable within 2.5 seconds on a typical mobile connection•
•
•
•
•
•
•
•
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
8.
9.
•
•
35

===== PAGE 36 =====
API cached response under 500 milliseconds
Administration searches under two seconds for normal datasets
27.2 Availability
MVP target:
99.5% monthly availability for the public site
Scheduled import failures must not take down the public site
27.3 Accessibility
Target WCAG 2.2 AA.
Requirements:
Keyboard navigation
Visible focus states
Semantic headings
Accessible form labels
Colour not used as the only meaning
Text alternatives for chart conclusions
Sufficient contrast
Screen-reader-readable price and forecast values
27.4 Responsive design
Must support:
320px mobile width
Tablets
Standard desktop
Wide desktop
Charts must not require horizontal scrolling for normal use.
27.5 Browser support
Support current stable versions of:
Chrome
Edge
Firefox
Safari
Mobile Chrome
Mobile Safari•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
36

===== PAGE 37 =====
27.6 Localisation readiness
Even if the MVP is English-only:
Text must not be hard-coded throughout components.
Dates and currencies must use locale-aware formatting.
Region metadata must support local names.
Decimal and thousands separators must be configurable.
28. Security requirements
28.1 Administrative access
Authentication required
Strong password or passwordless authentication
MFA where available
Session expiration
Role-based access
Login attempt monitoring
28.2 Secrets
API keys and affiliate credentials must:
Use a secret-management facility
Never appear in source control
Never be returned to the browser
Be rotated following suspected exposure
28.3 Input security
Validate all inputs
Sanitize rendered editorial content
Prevent script injection
Restrict uploaded file types
Use parameterised database queries
Add rate limiting to public forms
28.4 Audit logging
Audit events should include:
User login
Permission changes•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
37

===== PAGE 38 =====
Forecast publication
Event publication
Product-match override
Price correction
Index methodology change
Affiliate-configuration change
29. Privacy and consent requirements
The MVP should minimise personal data.
Potential personal data:
Administrative user details
Newsletter signup details
Anonymous analytics identifiers
Affiliate-click identifiers
Contact-form submissions
Requirements:
Clear privacy notice
Consent management for non-essential tracking
No advertising or affiliate tracker before consent where legally required
Data-retention schedule
Newsletter consent evidence
Unsubscribe support
User-data deletion process
Separation of necessary operational logs from marketing analytics
30. Analytics requirements
Track:
Page views
Unique sessions
Region selection
Chart date-range changes
Category selection
Forecast views
Methodology views
Affiliate clicks
Newsletter signup•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
38

===== PAGE 39 =====
Data-error reports
Do not collect unnecessary detailed behavioural data during the MVP.
31. SEO requirements
Every public entity should have:
Unique title
Unique meta description
Canonical URL
Open Graph metadata
Structured heading hierarchy
Server-rendered content
Crawlable text summary of charts
Sitemap inclusion
Last-modified date
Structured data may be added where genuinely applicable, but must not misrepresent financial or product
claims.
32. Testing strategy
32.1 Unit tests
Required for:
Currency conversion
Tax normalisation
Product matching helpers
Median calculations
Index calculations
Outlier filtering
Forecast scoring
Affiliate-link construction
32.2 Integration tests
Required for:
Data-source imports
Raw observation creation
Product matching•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
39

===== PAGE 40 =====
Daily derivation
Daily index generation
Event publication
Forecast publication
Forecast scoring
32.3 End-to-end tests
Core journeys:
Visitor selects a region.
Visitor views an index.
Visitor views an event annotation.
Visitor reads a forecast.
Visitor follows an affiliate link.
Editor creates and publishes an event.
Data reviewer resolves a product match.
Senior editor publishes a forecast.
Administrator retries a failed import.
32.4 Data regression tests
Maintain fixed sample datasets for:
DDR4 memory
DDR5 memory
SSD listings
Tax-inclusive prices
Tax-exclusive prices
Marketplace listings
Discounted products
Invalid bundles
Index calculations must produce repeatable results from fixed data.
33. Engineering epics
Epic E01: Project foundation
Goal
Create the development foundation, environments, deployment workflow and shared engineering
standards.•
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
8.
9.
•
•
•
•
•
•
•
•
40

===== PAGE 41 =====
Stories
E01-S01: Create source repositories
As a developer, I need version-controlled repositories so the team can collaborate safely.
Acceptance criteria:
Repository structure agreed
Branch protection enabled
Pull-request review required
Secret scanning enabled
Code ownership configured
README includes local setup
E01-S02: Configure local development
Acceptance criteria:
Application runs locally
Local database starts with one command
Seed data available
Environment-variable example supplied
No production credentials required
E01-S03: Configure CI
Acceptance criteria:
Linting runs on pull requests
Type checking runs
Unit tests run
Build verification runs
Failed checks block merge
E01-S04: Configure staging deployment
Acceptance criteria:
Staging deploys automatically from the agreed branch
Database migrations run safely
Staging uses separate credentials
Rollback process documented•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
41

===== PAGE 42 =====
Epic E02: Geographic and retailer foundation
Goal
Create regional, currency, retailer and affiliate configuration.
Stories
E02-S01: Manage currencies
Acceptance criteria:
Administrator can create and edit currencies
Currency codes are unique
Display formatting is locale-aware
Unsupported decimal configurations are rejected
E02-S02: Manage regions
Acceptance criteria:
Administrator can create regions
Each region has a default currency
Tax-display method is required
Region can be hidden without deletion
E02-S03: Manage retailers
Acceptance criteria:
Retailer belongs to a region
Tax and marketplace settings are configurable
Retailer can be disabled
Affiliate programme can be attached
E02-S04: Import exchange rates
Acceptance criteria:
Daily exchange rates are stored
Duplicate daily rates are prevented
Stale data creates an alert
Conversion calculation is unit tested•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
42

===== PAGE 43 =====
Epic E03: Canonical product catalogue
Goal
Create a reliable canonical product catalogue for memory and SSDs.
Stories
E03-S01: Create manufacturers
E03-S02: Create product categories
E03-S03: Create canonical products
Acceptance criteria:
Part number is required where available
Specifications are validated by category
Duplicate part numbers are flagged
Product status is supported
Products can be marked index eligible
E03-S04: Import initial product catalogue
Acceptance criteria:
Initial 30–60 products created
Specifications reviewed
Products assigned to launch categories
Every product has a canonical name and part number
Epic E04: Retailer data ingestion
Goal
Import retailer and marketplace data reliably.
Stories
E04-S01: Create generic import framework
Acceptance criteria:
Import sources use a shared interface•
•
•
•
•
•
•
•
•
•
43

===== PAGE 44 =====
Raw source file is retained
Import status is recorded
Imports are retryable
Duplicate imports are prevented
E04-S02: Implement first retailer source
E04-S03: Implement second retailer source
E04-S04: Implement marketplace source
E04-S05: Add scheduled imports
Acceptance criteria:
Schedule is configurable
Concurrent duplicate runs are blocked
Failure alert is generated
Successful run summary is available
Epic E05: Product matching and review
Goal
Match retailer listings to canonical products accurately.
Stories
E05-S01: Exact part-number matching
E05-S02: Specification extraction
E05-S03: Confidence scoring
E05-S04: Manual review queue
Acceptance criteria:
Reviewer sees suggested matches
Reviewer can confirm, reject or create product
Decision is audited
Similar future listings benefit from approved mappings•
•
•
•
•
•
•
•
•
•
•
•
44

===== PAGE 45 =====
E05-S05: Listing lifecycle management
Acceptance criteria:
First and last seen dates recorded
Missing listings become inactive after configured period
Product changes are detected where possible
Epic E06: Price history and daily derivation
Goal
Store raw prices and calculate daily product prices.
Stories
E06-S01: Store immutable raw observations
E06-S02: Validate price observations
E06-S03: Qualify offers
E06-S04: Calculate daily product prices
E06-S05: Implement price corrections
Acceptance criteria:
Original observation remains unchanged
Correction reason is required
Public calculations use approved correction
Correction appears in audit log
Epic E07: Category indices
Goal
Create transparent regional price indices.•
•
•
•
•
•
•
45

===== PAGE 46 =====
Stories
E07-S01: Create index definitions
E07-S02: Configure eligibility rules
E07-S03: Manage index membership
E07-S04: Calculate daily index values
E07-S05: Calculate data-quality state
E07-S06: Display index history
Acceptance criteria:
Raw and indexed modes supported
Baseline displayed
Missing days handled transparently
Quality state shown
Currency clearly displayed
Epic E08: Market events and sources
Goal
Allow editors to publish evidence-backed market events.•
•
•
•
•
46

===== PAGE 47 =====
Stories
E08-S01: Manage source organisations
E08-S02: Manage source items
E08-S03: Create market events
E08-S04: Attach sources to events
E08-S05: Add category impact
E08-S06: Add regional impact
E08-S07: Publish event pages
Acceptance criteria:
Facts and analysis are separate
Sources are visible
Event date and publication date are distinct
Confidence is required
Regional impacts can differ
Epic E09: Forecasting and recommendations
Goal
Publish transparent forecasts and track results.•
•
•
•
•
47

===== PAGE 48 =====
Stories
E09-S01: Create forecast drafts
E09-S02: Add evidence and counterevidence
E09-S03: Approval workflow
E09-S04: Publish forecast pages
E09-S05: Detect forecasts requiring review
E09-S06: Calculate forecast outcomes
E09-S07: Publish forecast scorecard
Acceptance criteria:
Failed forecasts remain visible
Confidence shown
Expected range shown
Recommendation shown
Outcome linked to original forecast
Epic E10: Public website
Goal
Deliver the public consumer experience.•
•
•
•
•
48

===== PAGE 49 =====
Stories
E10-S01: Global homepage
E10-S02: Regional selector
E10-S03: Regional market page
E10-S04: Category page
E10-S05: Product page
E10-S06: Event page
E10-S07: Forecast page
E10-S08: Methodology page
E10-S09: Responsive navigation
E10-S10: Accessibility pass
Epic E11: Affiliate and commercial foundation
Goal
Support disclosed affiliate links and basic revenue measurement.
Stories
E11-S01: Configure affiliate programmes
E11-S02: Generate regional affiliate links
E11-S03: Create affiliate redirect endpoint
E11-S04: Record privacy-conscious click analytics
E11-S05: Display affiliate disclosure
Acceptance criteria:
Disclosure is visible before commercial links
Destination URL is validated
Region-specific campaign is used
Commercial configuration cannot change rankings•
•
•
•
49

===== PAGE 50 =====
Epic E12: Operations and quality
Goal
Make the MVP supportable and trustworthy.
Stories
E12-S01: Import monitoring dashboard
E12-S02: Data-quality issue queue
E12-S03: Automated anomaly detection
E12-S04: Error-report form
E12-S05: Audit log
E12-S06: Backup and recovery procedure
E12-S07: Production alerting
34. Twelve-week sprint plan
Sprint 1: Foundation and schema
Weeks 1–2
Primary outcomes:
Development environments
CI pipeline
Initial database
Regions and currencies
Product categories
Canonical product schema
Tickets:
E01-S01
E01-S02
E01-S03•
•
•
•
•
•
•
•
•
50

===== PAGE 51 =====
E02-S01
E02-S02
E03-S01
E03-S02
E03-S03
Sprint review demonstration:
Create a region
Create a currency
Create a manufacturer
Create a DDR5 product
Run automated tests
Sprint 2: Retail sources and raw data
Weeks 3–4
Primary outcomes:
Retailer configuration
First import source
Raw feed retention
Raw listing and price records
Exchange-rate import
Tickets:
E02-S03
E02-S04
E04-S01
E04-S02
E04-S05
E06-S01
Sprint review demonstration:
Run an import
View import summary
Inspect retained source data
View raw price observations
View current exchange rate•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
51

===== PAGE 52 =====
Sprint 3: Matching and daily prices
Weeks 5–6
Primary outcomes:
Automated matching
Review queue
Daily product-price calculations
Corrections
Tickets:
E05-S01
E05-S02
E05-S03
E05-S04
E06-S02
E06-S03
E06-S04
E06-S05
Sprint review demonstration:
Import unmatched listing
Review suggested product
Confirm match
Generate daily regional product price
Apply correction while preserving original data
Sprint 4: Indices and public charts
Weeks 7–8
Primary outcomes:
Index definitions
Eligibility rules
Daily index values
Quality rating
Initial public category page•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
52

===== PAGE 53 =====
Tickets:
E07-S01
E07-S02
E07-S03
E07-S04
E07-S05
E07-S06
E10-S04
Sprint review demonstration:
Create a 32GB DDR5 index
Calculate 14 days of values
Show raw and indexed graph
Show quality status
Show product count and retailer count
Sprint 5: Events and forecasts
Weeks 9–10
Primary outcomes:
Source register
Event editor
Regional impacts
Forecast workflow
Forecast page
Tickets:
E08-S01
E08-S02
E08-S03
E08-S04
E08-S05
E08-S06
E09-S01
E09-S02
E09-S03
E10-S06
E10-S07•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
53

===== PAGE 54 =====
Sprint review demonstration:
Create source
Publish global event
Add UK and Japan impacts
Create forecast
Submit for approval
Publish forecast
Sprint 6: Public MVP and operational readiness
Weeks 11–12
Primary outcomes:
Homepage
Regional pages
Product pages
Affiliate links
Monitoring
Accessibility
Private beta release
Tickets:
E10-S01
E10-S02
E10-S03
E10-S05
E10-S08
E10-S09
E10-S10
E11-S01
E11-S02
E11-S03
E11-S04
E11-S05
E12-S01
E12-S02
E12-S03
E12-S04
E12-S05
E12-S06
E12-S07•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
54

===== PAGE 55 =====
Sprint review demonstration:
Navigate complete public site
Select region
View category index
Read event and forecast
Follow disclosed affiliate link
View failed-import alert
Submit data-error report
35. Post-MVP backlog
Priority P1
Newsletter integration
Used-market index
Forecast scorecard automation
Regional preference cookie
Chart CSV download
Improved product search
Retailer stock-history view
Public correction log
Priority P2
User accounts
Watchlists
Price alerts
Complete-build cost index
Canada and Australia
French and Dutch retailer support
Premium supporter tier
Priority P3
GPU indices
CPU indices
Prebuilt PC tracking
Professional dashboard
External API
Webhook alerts
Commercial data exports
White-label charts•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
55

===== PAGE 56 =====
36. Definition of ready
A ticket is ready for development when:
User or system value is clear .
Acceptance criteria are testable.
Dependencies are identified.
Required designs are attached.
Data-source assumptions are documented.
Security and privacy implications have been considered.
No unresolved product decision blocks implementation.
37. Definition of done
A ticket is complete when:
Code is implemented.
Code has been reviewed.
Automated tests pass.
Acceptance criteria pass.
Error handling is included.
Logging is appropriate.
Documentation is updated.
Accessibility has been considered.
Security review is complete where relevant.
Feature works in staging.
Product owner or assigned reviewer accepts it.
No unresolved critical defect remains.
38. Release gates
Private beta gate
The system may enter private beta when:
Four regions are configured.
At least three regions have sufficient retail data.
At least three category indices are public.
Daily prices have run successfully for 30 days.
Product-match accuracy exceeds 85%.
Every index has a quality rating.
Event and forecast workflows function.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
56

===== PAGE 57 =====
Affiliate disclosure is implemented.
Privacy and cookie controls are live.
Monitoring and backups are tested.
Critical accessibility issues are resolved.
Public launch gate
The system may launch publicly when:
Beta feedback has been reviewed.
No critical data-integrity issue remains.
At least ten meaningful events are published.
At least three active forecasts are published.
Methodology is complete.
Correction process has been tested.
Forecast-scorecard logic has been tested.
At least one complete forecast has been scored where timing permits.
Public pages pass performance and accessibility checks.
Affiliate links have been manually verified by region.
39. Initial team allocation
Product owner
Immediate tickets:
Finalise launch index definitions
Confirm region methodology
Approve terminology
Own backlog order
Accept sprint output
Technical lead
Immediate tickets:
Architecture
Repository
CI
Database approach
Security model
Deployment•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
57

===== PAGE 58 =====
Data engineer
Immediate tickets:
Source evaluation
Import framework
Canonical product catalogue
Matching engine
Daily calculations
Front-end developer
Immediate tickets:
Design system
Homepage
Region selector
Index charts
Responsive layouts
Accessibility
Market editor
Immediate tickets:
Source taxonomy
Event model
Forecast template
Launch content
Methodology
Commercial lead
Immediate tickets:
Affiliate programme register
Regional retailer partnerships
Disclosure requirements
Revenue analytics
Sponsor research
40. First team workshop agenda
The first implementation workshop should resolve the following.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
58

===== PAGE 59 =====
Product decisions
Final four launch regions
Exact launch indices
Minimum publication threshold
Forecast terminology
Recommendation terminology
Data decisions
First retailer source
Canonical product identifiers
Tax-normalisation method
Daily collection time
Marketplace inclusion rules
Outlier rules
Technical decisions
Application framework
Database
Job scheduler
Authentication
Chart library
Deployment method
Monitoring platform
Editorial decisions
Source tiers
Publication approval
Forecast approval
Correction process
Review cadence
Commercial decisions
Affiliate programmes
Link-redirection method
Consent requirements
Sponsor exclusions
Commercial/editorial separation
Workshop output should be a signed-off decision log and a final Sprint 1 backlog.•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
59

===== PAGE 60 =====
41. Recommended first implementation milestone
The first meaningful vertical slice should be:
Import US DDR5 prices from one source, match them to canonical products, calculate a daily
32GB DDR5 index and display it on a private category page with its data-quality status.
This vertical slice proves:
Source integration
Product catalogue
Product matching
Raw price storage
Daily derivation
Index calculation
API output
Public charting
Data-quality communication
The team should complete this before trying to build the full homepage or support every launch market.
42. Final MVP outcome
At the end of the initial delivery period, the platform should allow a visitor to:
Understand whether the global memory market is rising or falling.
See how that movement differs across supported regions.
View a regional price history in local currency.
Compare regional movement on a common indexed scale.
Inspect the market events associated with price movement.
Understand the evidence and uncertainty.
Read a buy-or-wait recommendation.
Review previous forecasts and their outcomes.
Follow a regionally appropriate affiliate link.
Verify how every public index and forecast was created.
Internally, the team should be able to:
Add new regions and retailers.
Import data safely.
Review product matches.
Correct derived results without deleting raw data.
Create and publish market events.
Publish accountable forecasts.
Monitor data quality.•
•
•
•
•
•
•
•
•
1.
2.
3.
4.
5.
6.
7.
8.
9.
10.
1.
2.
3.
4.
5.
6.
7.
60

===== PAGE 61 =====
Identify failed jobs and stale sources.
Review affiliate performance.
Expand categories without redesigning the entire system.8.
9.
10.
61
