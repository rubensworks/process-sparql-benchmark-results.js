# Process SPARQL Benchmark Results

[![Build status](https://github.com/rubensworks/process-sparql-benchmark-results.js/workflows/CI/badge.svg)](https://github.com/rubensworks/process-sparql-benchmark-results.js/actions?query=workflow%3ACI)
[![Coverage Status](https://coveralls.io/repos/github/rubensworks/process-sparql-benchmark-results.js/badge.svg?branch=master)](https://coveralls.io/github/rubensworks/process-sparql-benchmark-results.js?branch=master)
[![npm version](https://badge.fury.io/js/@rubensworks/sparql-benchmark-runner.svg)](https://www.npmjs.com/package/@rubensworks/sparql-benchmark-runner)

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
  psbr tex  Creates a LaTeX TikZ plot file

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
      --svg                        If the tex file should be converted to svg
                                   via the tex2svg command
                                                      [boolean] [default: false]
```

## License
This code is copyrighted by [Ghent University – imec](http://idlab.ugent.be/)
and released under the [MIT license](http://opensource.org/licenses/MIT).
