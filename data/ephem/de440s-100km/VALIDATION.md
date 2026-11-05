# Validation of the rails pack

Written by `starshot-ephem validate`. Do not edit it by hand; rerun the command.

- Pack: `starshot-de440s-1950-2150-100km`, 20 decade files, 1,085,440 bytes in total.
- Reference: JPL DE440 through the local kernel, de440s.bsp (MD5 3917ee56769db332790c751e2168843d).
- Sampling: ET -1577880000 to 4733553600, every 432,000 s plus each decade edge and the end, 14,623 points per body.
- Budget: 150 km for every body. Pass means the largest position error is within it.

| Body | Centre | Segment (days) | Degree | Max position (km) | RMS position (km) | Max direction (arcmin) | Pass |
|---|---|---:|---:|---:|---:|---:|---|
| MERCURY | SUN | 32 | 12 | 55.182 | 14.052 | 0.004094 | pass |
| VENUS | SUN | 256 | 15 | 40.905 | 14.900 | 0.001193 | pass |
| EMB | SUN | 256 | 12 | 39.165 | 12.031 | 0.000893 | pass |
| MARS | SUN | 512 | 17 | 86.606 | 24.695 | 0.001393 | pass |
| JUPITER | SUN | 512 | 8 | 72.285 | 33.380 | 0.000315 | pass |
| SATURN | SUN | 512 | 8 | 72.739 | 33.283 | 0.000172 | pass |
| URANUS | SUN | 512 | 8 | 72.656 | 33.220 | 0.000086 | pass |
| NEPTUNE | SUN | 512 | 8 | 72.197 | 33.179 | 0.000053 | pass |
| MOON | EARTH | 32 | 15 | 56.810 | 13.807 | 0.524349 | pass |
