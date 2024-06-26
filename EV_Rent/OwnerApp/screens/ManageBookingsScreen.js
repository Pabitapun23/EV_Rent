import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';

// Your Firebase config file
import { db } from '../firebaseConfig';

const ManageBookingsScreen = () => {

    // state variables
    const [bookings, setBookings] = useState([]);
    const [usernameFromUI, setUsernameFromUI] = useState("amy@gmail.com");

    const formatDate = (isoDateString) => {
        if (!isoDateString) return '';
        const date = new Date(isoDateString); // Directly parse the ISO string
        return date.toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        }); // Example: "April 8, 2024, 7:54 PM PDT"
    };

    useEffect(() => {

        const fetchBookingsForOwner = async (ownerId) => {
            // Step 1: Fetch all vehicles owned by the ownerId
            const vehiclesQuery = query(collection(db, 'Vehicle'), where('owner', '==', ownerId));
            const vehiclesSnapshot = await getDocs(vehiclesQuery);
            const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("vehicles", vehicles);
            let allBookings = [];
            for (const vehicle of vehicles) {
                const bookingQuery = query(collection(db, 'Booking'), where('vehicle', '==', vehicle.id));
                const bookingsSnapshot = await getDocs(bookingQuery);
                const bookingsForVehicle = bookingsSnapshot.docs.map(doc => {
                    console.log("Booking document data:", doc.data()); // Log the booking document data
                    console.log("Vehicle info:", vehicle);
                    return ({ ...doc.data(), id: doc.id, vehicleInfo: vehicle });
                });
                allBookings = [...allBookings, ...bookingsForVehicle];
            }
            console.log("All bookings:", allBookings);
            setBookings(allBookings);
        };

        fetchBookingsForOwner(usernameFromUI); // Pass the actual owner ID here
    }, []);

    const handleApproveBooking = async (bookingId) => {
        // Generate a confirmation code
        const confirmationCode = Math.random().toString(36).substr(2, 9); // Simple example, consider using a more robust method

        // Update the booking in Firestore with 'Approved' status and confirmation code
        const bookingRef = doc(db, 'Booking', bookingId);
        await updateDoc(bookingRef, {
            status: 'confirmed',
            confirmationCode: confirmationCode,
        });
        const index = bookings.findIndex(booking => booking.id === bookingId);
        if (index !== -1) {
            // Clone the bookings array for immutability
            const updatedBookings = [...bookings];
            // Update the specific booking
            updatedBookings[index] = { ...updatedBookings[index], status: 'confirmed', confirmationCode: confirmationCode };
            // Update the state
            setBookings(updatedBookings);
        }
    };

    const handleDeclineBooking = async (bookingId) => {
        // Update the booking in Firestore with 'Declined' status
        const bookingRef = doc(db, 'Booking', bookingId);
        await updateDoc(bookingRef, {
            status: 'declined',
        });

        const index = bookings.findIndex(booking => booking.id === bookingId);
        if (index !== -1) {
            // Clone the bookings array for immutability
            const updatedBookings = [...bookings];
            // Update the specific booking
            updatedBookings[index] = { ...updatedBookings[index], status: 'declined' };
            // Update the state
            setBookings(updatedBookings);
        }
    };

    const renderManageBookingItem = ({ item }) => (
        <View style={styles.bookingItem}>
            <Image source={{ uri: item.vehicleInfo.vehiclePhoto }} style={styles.bookingImage} />
            <View style={styles.bookingListsItem}>
                <Text style={styles.bookingTitle}>{item.vehicleInfo.vehicleName}</Text>
                <Text style={styles.bookingDate}>{formatDate(item.bookingDate)}</Text>
                <Text>{item.vehicleInfo.pickupLocation.address}</Text>
                <Text>Renter: {item.renter}</Text>
                <Text>License: {item.vehicleInfo.licensePlate}</Text>
                <View style={styles.bookingCol}>
                    <Text style={styles.bookingPrice}>${item.vehicleInfo.price}</Text>
                    <Text style={styles.bookingStatus}> |  Status: {item.status}</Text>
                </View>

                {item.status === 'confirmed' && <Text>Confirmation Code: {item.confirmationCode}</Text>}
                {item.status === 'pending' && (
                    <View style={styles.buttonsContainer}>
                        {/* <Pressable onPress={() => handleApproveBooking(item.id)} >
                            <Text>Approve</Text>
                        </Pressable>
                        <Pressable title="Decline" onPress={() => handleDeclineBooking(item.id)} /> */}

                        <TouchableOpacity style={styles.approveButton} onPress={() => handleApproveBooking(item.id)}>
                            <Text style={styles.buttonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.declineButton} onPress={() => handleDeclineBooking(item.id)}>
                            <Text style={styles.buttonText}>Decline</Text>
                        </TouchableOpacity>

                    </View>
                )}

            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={bookings}
                keyExtractor={(item, index) => item.id ? item.id : index.toString()}

                renderItem={({ item }) => renderManageBookingItem({ item })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    renterPhoto: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: "70%",
    },

    // booking
    bookingItem: {
        backgroundColor: '#f9f9f9',
        padding: 20,
        marginVertical: 5,
        marginHorizontal: 8,
        borderRadius: 5,
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    bookingListsItem: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: 10,
        width: '75%',
    },

    bookingTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },

    bookingImage: {
        width: "40%",
        height: 100,
        marginVertical: 10,
        marginRight: 10,
        borderRadius: 10
    },
    bookingCol: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '70%',
    },

    bookingPrice: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0064B1',
    },
    bookingStatus: {
        fontSize: 14,
        fontWeight: '500',
        color: 'gray',
    },
    bookingDate: {
        fontSize: 12,
        color: 'gray',
    },

    approveButton: {
        backgroundColor: 'green',
        padding: 10,
        margin: 10,
        borderRadius: 5,
    },
    declineButton: {
        backgroundColor: 'red',
        padding: 10,
        margin: 10,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },

});

export default ManageBookingsScreen;
