# Deflator and release-vintage alternatives

State: **NONE SELECTED — PROPOSED_LOCKED**

Wave 1 identified six exact ONS discovery candidates without retaining a statistical release package or selecting a series:

- `L522` — CPIH all items;
- `D7BT` — CPI all items;
- `D7EP` — CPI data-processing equipment;
- `L7GU` — CPI accessories for information-processing equipment;
- `CHAW` — RPI all items;
- `YBGB` — GDP implied deflator.

Each has material conceptual or operational drawbacks. Broad measures may be remote from imported retail RAM; narrow technology measures may remove the movement being studied or have unstable composition; RPI has known status/method limitations; the GDP deflator is quarterly, revisable and conceptually misaligned.

Release-policy shapes considered, with none selected:

- first available release per month;
- one named coherent release edition for the full span;
- latest edition preserved as a separate immutable view;
- freeze after an approved lag.

The synthetic fixture `SYNTHETIC-OFFICIAL-DEFLATOR-X` and its two synthetic release vintages test exact checksum binding, mixed-vintage rejection, additive revisions and explicit unavailable states only. They are not ONS selections.

A future decision requires an approved product question, exact release-edition bytes/checksums, CDID/title/unit/frequency/status evidence, observation status handling, coherent revision/supersession policy, complete nominal months and separate attributable approvals for series, release policy and reference period. None is requested here.
