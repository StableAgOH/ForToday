// noinspection JSIgnoredPromiseFromCall

import { Box, Container, IconButton, SimpleGrid, Stack, useToast } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useBoolean, useInterval, useWindowSize } from "react-use";
import { RepeatIcon, SpinnerIcon, TriangleDownIcon } from "@chakra-ui/icons";

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);
    const [start, setStart] = useState(0);
    const { width } = useWindowSize();
    const [autoRefresh, setAutoRefresh] = useBoolean(true);

    const lastClick = useRef<number>(Date.now() - 2000);

    const visibleCardCount = useMemo(() =>
    {
        return Math.floor(Math.min(width, 1280) / 300);
    }, [width]);
    const updateInterval = useMemo(() =>
    {
        return 1000 * 5 * visibleCardCount;
    }, [visibleCardCount]);

    const sortedData = useMemo(() =>
    {
        return Object.entries(data)
            .sort(([, st], [_, st2]) => (st.rank || -1) - (st2.rank || -1));
    }, [data]);

    const cards = useMemo(() =>
    {
        return sortedData.map(([name, status]) =>
        {
            return <UserCard key={Math.random().toString()} name={name} status={status}/>;
        });
    }, [sortedData]);

    const visibleCards = useMemo(() =>
    {
        const _cards = [];
        for(let i = start; i < start + visibleCardCount; i++)
        {
            _cards.push(cards[i % cards.length]);
        }
        return _cards;
    }, [start, visibleCardCount, cards]);

    useInterval(async () =>
    {
        const res = await fetch("/api/data");
        if(res.status === 200)
        {
            const data = await res.json();
            setData(data);
        }
    }, autoRefresh ? updateInterval * 4 : null);

    useEffect(() =>
    {
        const timerID = setTimeout(() =>
        {
            setStart((start + visibleCardCount) % cards.length);
        }, updateInterval);
        return () => clearTimeout(timerID);
    }, [start, visibleCardCount, cards.length, updateInterval]);

    const toggleAutoRefresh = useCallback(() =>
    {
        setAutoRefresh(!autoRefresh);
    }, [autoRefresh, setAutoRefresh]);

    const goNext = useCallback(() =>
    {
        if(Date.now() - lastClick.current >= 2000)
        {
            setStart((start + visibleCardCount) % cards.length);
            lastClick.current = Date.now();
        }
    }, [start, visibleCardCount, cards.length]);

    return (
        <>
            <Container maxW="container.xl">
                {visibleCardCount !== 1 && <Box className={"activeCardIndicator"}>
                    <Stack direction={"column"} spacing={6}>
                        <UpdateButton/>
                        <Stack direction={"column"} spacing={2}>
                            <IconButton
                                aria-label={"refresh"}
                                icon={<RepeatIcon/>}
                                variant={autoRefresh ? "solid" : "outline"}
                                onClick={toggleAutoRefresh}
                            />
                            <IconButton
                                aria-label={"next page"}
                                icon={<TriangleDownIcon/>}
                                onClick={goNext}
                            />
                        </Stack>
                    </Stack>
                </Box>}
                <Box m={6} p={6}>
                    <AnimatePresence exitBeforeEnter>
                        <motion.div
                            key={Math.random().toString()}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <SimpleGrid columns={visibleCardCount} spacing={10}>
                                {visibleCards}
                            </SimpleGrid>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) =>
{
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");

    const data = await client.get("data");
    if(!data)
    {
        return {
            props: {
                result: {}
            }
        };
    }
    const result: Record<string, UserProblemStatus> = JSON.parse(data);
    return {
        props: {
            result
        }
    };
};

const UpdateButton: React.FC = () =>
{
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    return <IconButton
        aria-label={"update"}
        icon={<SpinnerIcon/>}
        isLoading={loading}
        onClick={() =>
        {
            if(!loading)
            {
                setLoading(true);
                fetch("/api/refresh")
                    .then(() =>
                    {
                        setLoading(false);
                        toast({
                            title: "更新成功",
                            status: "success",
                            duration: 2000,
                            isClosable: false
                        });
                    });
            }
        }}
    />;
};
