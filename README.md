# Process SPARQL Benchmark Results

[![Build status](https://github.com/rubensworks/process-sparql-benchmark-results.js/workflows/CI/badge.svg)](https://github.com/rubensworks/process-sparql-benchmark-results.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/process-sparql-benchmark-results.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/process-sparql-benchmark-results.js?branch=master)
[![npm version](https://badge.fury.io/js/@rubensworks/process-sparql-benchmark-results.svg)](https://www.npmjs.com/package/@rubensworks/process-sparql-benchmark-results)

This package contains a set of tools to post-process query results from SPARQL benchmarks.

Be aware that this is primarily intended for my personal usage.
So I may be making some assumptions here and there that may not be valuable for everyone.
Furthermore, code in this package is minimally tested, and breaking changes may occur at any time.

Most of these tools work on output produced by [jbr](https://github.com/rubensworks/jbr.js) experiments.

## 1. Installation

```bash
$ npm install -g @rubensworks/sparql-benchmark-runner
```

or 

```bash
$ yarn global add @rubensworks/sparql-benchmark-runner
```

## 2. Usage

After installing this package, the `psbr` CLI tool will become available,
which consists of a number of sub-commands,
as explained hereafter.

**Full usage**:
```text
psbr <command>

Commands:
  psbr csv    Creates CSV files
  psbr stats  Derive statistics from experiments
  psbr tex    Creates a LaTeX TikZ plot file

Options:
      --version  Show version number                                   [boolean]
      --cwd      The current working directory             [string] [default: .]
  -v, --verbose  If more logging output should be generated            [boolean]
      --help     Show help
```

### 2.1. Create LaTeX TikZ plot files

Subcommands of `psbr tex` can create LaTeX TikZ files.

#### 2.1.1. Query execution times

By invoking `psbr tex query` with any number of experiment directories,
the `plot_queries_data.tex` and `plot_queries_data.csv` files will be created.
This TeX files contains a `TikZ` figure, which can be used to generate a vector plot from the CSV data.

By default, it will look for the `query-times.csv` file within each experiment directory.
This file is expected to look as follows:
```text
name;id;results;time;timestamps
interactive-short-4;0;0;4;
interactive-short-4;1;0;1;
interactive-short-5;0;0;0;
interactive-short-5;1;0;0;
```

**SVG output**:

Optionally, an SVG file can also be created using the `--svg` flag.

**Override labels**:

If you want to override the labels of experiments or queries, you can do this as follows:
```bash
$ psbr tex query combination_* --overrideCombinationLabels 'a,b,c,d' --overrideQueryLabels 'Q1,Q2'
```

**Full usage**:
```text
psbr tex query <experiment-dir...>

Plot the query execution times from the given experiments

Options:
      --version                    Show version number                 [boolean]
      --cwd                        The current working directory
                                                           [string] [default: .]
  -v, --verbose                    If more logging output should be generated
                                                                       [boolean]
      --help                       Show help                           [boolean]
  -q, --queryRegex                 Regex for queries to include (before any
                                   label overrides). Examples: '^C', '^[^C]',
                                   ...                                  [string]
  -n, --name                       Custom output file name
                                         [string] [default: "plot_queries_data"]
  -c, --color                      Color scheme name from colorbrewer2.org
                                                                        [string]
      --shiftColorList             How many color list elements should be
                                   skipped                 [number] [default: 0]
      --maxY                       The upper limit of the Y-axis. Defaults to
                                   maximum Y value                      [number]
      --legend                     If a legend should be included
                                                       [boolean] [default: true]
      --legendPos                  The legend position X,Y (anchor north-east)
                                                   [string] [default: "1.0,1.0"]
      --logY                       If the Y-Axis must have a log scale
                                                      [boolean] [default: false]
      --inputName                  Custom input file name per experiment
                                           [string] [default: "query-times.csv"]
      --inputDelimiter             Delimiter for the input CSV file
                                                         [string] [default: ";"]
      --overrideCombinationLabels  Comma-separated list of combination labels to
                                   use                                  [string]
      --overrideQueryLabels        Comma-separated list of query labels to use
                                                                        [string]
      --zeroReplacement            If zero values occur, what values they should
                                   be replaced with        [number] [default: 0]
      --svg                        If the tex file should be converted to svg
                                   via the tex2svg command
                                                      [boolean] [default: false]
      --metric                     The metric to plot
                    [string] [choices: "time", "httpRequests"] [default: "time"]
      --relative                   If the maximum value per query should be set
                                   to 1, and all other values made relative to
                                   that.              [boolean] [default: false]
```

#### 2.1.2. Query result arrival times

This command will create a vectorial CSV-based (LaTeX/TiKZ) plot that compares compares the query result arrival times over all given experiments.
This is useful for comparing the impact of different approaches on query result arrival times.

By invoking `psbr tex queryTimes` with any number of experiment directories,
the `query_times.tex` and `query_times.csv` files will be created.
This TeX files contains a `TikZ` figure, which can be used to generate a vector plot from the CSV data.

By default, it will look for the `query-times.csv` file within each experiment directory.
This file is expected to look as follows:
```text
name;id;results;time;timestamps
interactive-short-4;0;0;4;
interactive-short-4;1;0;1;
interactive-short-5;0;0;0;
interactive-short-5;1;0;0;
```

Optionally, another index of the query can be selected by suffixing the query name with `.index`, such as `psbr tex queryTimes L2.3`.

**Full usage**:
```text
psbr tex queryTimes <query> <experiment-dir...>

Plot the query result arrival times from the given experiments

Options:
      --version                    Show version number                 [boolean]
      --cwd                        The current working directory
                                                           [string] [default: .]
  -v, --verbose                    If more logging output should be generated
                                                                       [boolean]
      --help                       Show help                           [boolean]
  -n, --name                       Custom output file name
                                               [string] [default: "query_times"]
  -c, --color                      Color scheme name from colorbrewer2.org
                                                                        [string]
      --maxY                       The upper limit of the Y-axis. Defaults to
                                   maximum Y value                      [number]
      --legend                     If a legend should be included
                                                       [boolean] [default: true]
      --legendPos                  The legend position X,Y (anchor north-east)
                                                   [string] [default: "1.0,1.0"]
      --logY                       If the Y-Axis must have a log scale
                                                      [boolean] [default: false]
      --inputName                  Custom input file name per experiment
                                           [string] [default: "query-times.csv"]
      --inputDelimiter             Delimiter for the input CSV file
                                                         [string] [default: ";"]
      --overrideCombinationLabels  Comma-separated list of combination labels to
                                   use                                  [string]
      --svg                        If the tex file should be converted to svg
                                   via the tex2svg command
                                                      [boolean] [default: false]
```

### 2.2. Create CSV files

Subcommands of `psbr csv` can create CSV files.

#### 2.2.1. Summarize query execution times

By invoking `psbr csv query` with any number of experiment directories,
the `data_all.csv` file will be created.

By default, it will look for the `query-times.csv` file within each experiment directory.
This file is expected to look as follows:
```text
name;id;results;time;timestamps
interactive-short-4;0;0;4;
interactive-short-4;1;0;1;
interactive-short-5;0;0;0;
interactive-short-5;1;0;0;
```

Concretely, it will output the `data_all.csv` that looks as follows:
```csv
combination;time
output/combination_0;10963
output/combination_0;10849
output/combination_0;11912
output/combination_1;16320
output/combination_1;12389
output/combination_1;11944
```

You can for example use this data to calculate the statistical different between two combinations in R as follows:
```R
data <- read.csv('./data_all.csv', sep = ';')

# Calculate means
aggregate(data$time, list(data$combination), median)

# Compare means with Kruskal-Wallis test (nonparametric, if non-normal distribution)
kruskal.test(time ~ combination, data = data[which(data$combination=='output/combination_0' | data$combination=='output/combination_1'),])
# If p < 0.05, combinations have no difference with a significance of 95%.
# If p > 0.05, combinations are different with a significance of 95%.
```

**Full usage**:

```text
psbr csv query <experiment-dir...>

Summarize all query execution times from the given experiments

Options:
      --version         Show version number                            [boolean]
      --cwd             The current working directory      [string] [default: .]
  -v, --verbose         If more logging output should be generated     [boolean]
      --help            Show help                                      [boolean]
  -q, --queryRegex      Regex for queries to include (before any label
                        overrides). Examples: '^C', '^[^C]', ...        [string]
  -n, --name            Custom output file name
                                              [string] [default: "data_all.csv"]
      --inputName       Custom input file name per experiment
                                           [string] [default: "query-times.csv"]
      --inputDelimiter  Delimiter for the input CSV file [string] [default: ";"]
```

### 2.3. Derive statistics

Subcommands of `psbr stats` can derive statistics.

#### 2.3.1. Summarize Docker stats

By invoking `psbr stats docker` with a Docker experimental result file,
a summary of all its contents will be created.

For instance, if a Docker-based experiment may produce a file such as `stats-server.csv`,
which is expected to look as follows:
```text
cpu_percentage,memory,memory_percentage,received,transmitted
0.012520939947780679,122277888,5.856675939622464,882,0
0,122228736,5.8543217336372875,882,0
```

Based on this, the following summary will be printed
```csv
CPU: 0.01 %
Memory relative: 116.59 MB
Memory absolute: 5.86 %
Received: 0.00 MB
Transmitted: 0.00 MB
```

**Full usage**:

```text
psbr stats docker <docker-csv-file>

Show the stats of an Docker CSV file from an experiment

Options:
      --version  Show version number                                   [boolean]
      --cwd      The current working directory             [string] [default: .]
  -v, --verbose  If more logging output should be generated            [boolean]
      --help     Show help                                             [boolean]
  -d, --digits   The precision of output numbers           [number] [default: 2]
```

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
