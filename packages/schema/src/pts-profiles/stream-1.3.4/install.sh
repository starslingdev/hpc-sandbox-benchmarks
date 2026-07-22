#!/bin/bash
# Vendored VERBATIM from upstream phoronix-test-suite/test-profiles pts/stream-1.3.4/install.sh
# (fetched 2026-07-21) so the memory leaf can recompile the baked stream-bin in place with its own
# CFLAGS_OVERRIDE (see .mise/tasks/benchmark/memory/pts/stream) — the bake-time binary carries the
# bake runner's -march=native ISA (AVX-512 → SIGILL under gVisor) and L3-derived array size. Only
# this header and its shellcheck directive were added; every executable line is untouched upstream.
# MUST be invoked with bash, never sh: dash aborts fatally at $((L3_CACHE_SIZE * 4)) when getconf
# prints a non-number ("Illegal number: undefined"), dying before cc and leaving the stale binary.
# Inert to the catalog tooling: fetch-profiles.ts ignores siblings of test-definition.xml.
# shellcheck disable=SC2006,SC2086,SC2268
tar -jxf stream-2013-01-17.tar.bz2
if [ "X$CFLAGS_OVERRIDE" = "X" ]
then
          CFLAGS="$CFLAGS -O3 -march=native"
else
          CFLAGS="$CFLAGS_OVERRIDE"
fi

STREAM_ARRAY_SIZE=100000000
L3_CACHE_SIZE=`getconf LEVEL3_CACHE_SIZE`
SIZE_BASED_ON_L3=$((L3_CACHE_SIZE * 4))
if [ $SIZE_BASED_ON_L3 -gt $STREAM_ARRAY_SIZE ]
then
     STREAM_ARRAY_SIZE=$SIZE_BASED_ON_L3
fi
cc stream.c -DSTREAM_ARRAY_SIZE=$STREAM_ARRAY_SIZE -DNTIMES=100 $CFLAGS -fopenmp -o stream-bin
CC_EXIT_STATUS=$?
if [ $CC_EXIT_STATUS -gt 0 ]
then
    # Retry compiling with -mcmodel=medium set
    cc stream.c -DSTREAM_ARRAY_SIZE=$STREAM_ARRAY_SIZE -DNTIMES=100 -mcmodel=medium $CFLAGS -fopenmp -o stream-bin
    CC_EXIT_STATUS=$?
fi
echo $CC_EXIT_STATUS > ~/install-exit-status
echo "#!/bin/sh
export OMP_NUM_THREADS=\$NUM_CPU_CORES
./stream-bin > \$LOG_FILE 2>&1
echo \$? > ~/test-exit-status" > stream
chmod +x stream
